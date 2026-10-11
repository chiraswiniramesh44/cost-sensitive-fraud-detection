from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

from sqlalchemy import JSON, Float, String, Uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from ml.src.feedback.postgres_feedback_source import PostgresFeedbackSource


class FeedbackTestBase(DeclarativeBase):
    pass


class FakeFeedback(FeedbackTestBase):
    __tablename__ = "test_operator_feedback"

    id: Mapped[object] = mapped_column(Uuid, primary_key=True)
    transaction_id: Mapped[object] = mapped_column(Uuid)
    user_id: Mapped[object] = mapped_column(Uuid)
    decision: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column()


class FakeTransaction(FeedbackTestBase):
    __tablename__ = "test_transactions"

    id: Mapped[object] = mapped_column(Uuid, primary_key=True)
    payload_json: Mapped[dict] = mapped_column(JSON)
    amount: Mapped[float] = mapped_column(Float)


def test_postgres_feedback_source_maps_feedback_and_features():
    transaction_id = uuid4()
    user_id = uuid4()
    created_at = datetime.now(timezone.utc)

    feedback = SimpleNamespace(
        transaction_id=transaction_id,
        user_id=user_id,
        decision="CONFIRMED_FRAUD",
        created_at=created_at,
        id=uuid4(),
    )
    transaction = SimpleNamespace(
        id=transaction_id,
        payload_json={"Time": 10.0, "V1": 0.25},
        amount=125.0,
    )

    db = MagicMock()
    db.execute.return_value.all.return_value = [(feedback, transaction)]

    source = PostgresFeedbackSource(db, FakeFeedback, FakeTransaction)
    records = source.get_feedback()

    assert records == [
        {
            "transaction_id": str(transaction_id),
            "operator_id": str(user_id),
            "label": "CONFIRMED_FRAUD",
            "submitted_at": created_at.isoformat(),
            "features": {
                "Time": 10.0,
                "V1": 0.25,
                "Amount": 125.0,
            },
        }
    ]
    db.execute.assert_called_once()
