from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, Uuid, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

from ml.src.feedback.feedback_labels import FeedbackLabel
from ml.src.feedback.postgres_feedback_source import PostgresFeedbackSource
from ml.src.feedback.feedback_training_pipeline import (
    build_approved_training_data_from_store,
)
from ml.src.feedback.training_approval import TrainingApproval
from ml.src.feedback.training_data_builder import FEATURES


class IntegrationBase(DeclarativeBase):
    pass


class IntegrationTransaction(IntegrationBase):
    __tablename__ = "integration_transactions"

    id: Mapped[object] = mapped_column(Uuid, primary_key=True)
    payload_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)


class IntegrationFeedback(IntegrationBase):
    __tablename__ = "integration_feedback"

    id: Mapped[object] = mapped_column(Uuid, primary_key=True)
    transaction_id: Mapped[object] = mapped_column(
        Uuid,
        ForeignKey("integration_transactions.id"),
        nullable=False,
    )
    user_id: Mapped[object] = mapped_column(Uuid, nullable=False)
    decision: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )


def test_sql_feedback_retrieval_through_approved_training_pipeline():
    engine = create_engine("sqlite:///:memory:")
    IntegrationBase.metadata.create_all(engine)

    with Session(engine) as db:
        user_id = uuid4()
        decisions = [
            (FeedbackLabel.CONFIRMED_FRAUD, True),
            (FeedbackLabel.CONFIRMED_GENUINE, True),
            (FeedbackLabel.CONFIRMED_FRAUD, False),
            (FeedbackLabel.DISPUTED, True),
            (FeedbackLabel.INCONCLUSIVE, True),
        ]
        approved_ids = set()
        expected_ids = set()

        for decision, approved in decisions:
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
            db.add(
                IntegrationFeedback(
                    id=uuid4(),
                    transaction_id=transaction_id,
                    user_id=user_id,
                    decision=decision.value,
                    created_at=datetime.now(timezone.utc),
                )
            )

            if approved:
                approved_ids.add(str(transaction_id))

            if approved and decision in {
                FeedbackLabel.CONFIRMED_FRAUD,
                FeedbackLabel.CONFIRMED_GENUINE,
            }:
                expected_ids.add(str(transaction_id))

        db.commit()

        source = PostgresFeedbackSource(
            db=db,
            feedback_model=IntegrationFeedback,
            transaction_model=IntegrationTransaction,
        )

        retrieved = source.get_feedback()
        assert len(retrieved) == len(decisions)
        assert all(len(record["features"]) == len(FEATURES) for record in retrieved)

        examples = build_approved_training_data_from_store(
            source,
            TrainingApproval(frozenset(approved_ids)),
        )

        assert {example.transaction_id for example in examples} == expected_ids
        assert len(examples) == 2
        assert {example.label for example in examples} == {0, 1}

    engine.dispose()

