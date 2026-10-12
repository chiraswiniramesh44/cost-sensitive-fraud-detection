from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    JSON,
    String,
    Uuid,
    create_engine,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

from backend.app.db.session import engine as app_engine
from ml.src.feedback.feedback_training_pipeline import (
    build_approved_training_data_from_store,
)
from ml.src.feedback.postgres_feedback_source import PostgresFeedbackSource
from ml.src.feedback.training_approval import TrainingApproval
from ml.src.feedback.training_data_builder import FEATURES


class IntegrationBase(DeclarativeBase):
    pass


class IntegrationTransaction(IntegrationBase):
    __tablename__ = "transactions"

    id: Mapped[object] = mapped_column(Uuid, primary_key=True)
    payload_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)


class IntegrationFeedback(IntegrationBase):
    __tablename__ = "operator_feedback"

    id: Mapped[object] = mapped_column(Uuid, primary_key=True)
    transaction_id: Mapped[object] = mapped_column(
        Uuid, ForeignKey("transactions.id"), nullable=False
    )
    user_id: Mapped[object] = mapped_column(Uuid, nullable=False)
    decision: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


def main():
    schema = f"member2_test_{uuid4().hex}"
    quoted_schema = f'"{schema}"'

    with app_engine.begin() as connection:
        connection.execute(text(f"CREATE SCHEMA {quoted_schema}"))

    test_engine = create_engine(
        app_engine.url,
        pool_pre_ping=True,
        connect_args={"options": f"-csearch_path={schema}"},
    )

    try:
        IntegrationBase.metadata.create_all(test_engine)

        with Session(test_engine) as db:
            user_id = uuid4()
            approved_ids = set()

            cases = [
                ("CONFIRMED_FRAUD", True, 1),
                ("CONFIRMED_GENUINE", True, 0),
                ("CONFIRMED_FRAUD", False, None),
                ("DISPUTED", True, None),
                ("INCONCLUSIVE", True, None),
            ]

            for decision, approved, _ in cases:
                transaction_id = uuid4()
                features = {
                    feature: float(index + 1)
                    for index, feature in enumerate(FEATURES)
                }
                payload = {
                    key: value
                    for key, value in features.items()
                    if key != "Amount"
                }

                db.add(
                    IntegrationTransaction(
                        id=transaction_id,
                        payload_json=payload,
                        amount=features["Amount"],
                    )
                )
                db.flush()

                db.add(
                    IntegrationFeedback(
                        id=uuid4(),
                        transaction_id=transaction_id,
                        user_id=user_id,
                        decision=decision,
                        created_at=datetime.now(timezone.utc),
                    )
                )

                if approved:
                    approved_ids.add(str(transaction_id))

            db.commit()

            source = PostgresFeedbackSource(
                db,
                IntegrationFeedback,
                IntegrationTransaction,
            )
            examples = build_approved_training_data_from_store(
                source,
                TrainingApproval(frozenset(approved_ids)),
            )

            assert len(examples) == 2, (
                f"Expected 2 training examples; got {len(examples)}"
            )
            assert {example.label for example in examples} == {0, 1}
            assert all(
                len(example.features) == len(FEATURES)
                for example in examples
            )

            print("PostgreSQL feedback retrieval: PASS")
            print("Approval filtering and training labels: PASS")
            print("Feature mapping: PASS")

    finally:
        test_engine.dispose()
        with app_engine.begin() as connection:
            connection.execute(
                text(f"DROP SCHEMA IF EXISTS {quoted_schema} CASCADE")
            )


if __name__ == "__main__":
    main()
