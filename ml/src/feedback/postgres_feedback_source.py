from typing import Any, Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session


class FeedbackModel(Protocol):
    transaction_id: Any
    user_id: Any
    decision: str
    created_at: Any
    id: Any


class TransactionModel(Protocol):
    payload_json: dict[str, Any]
    amount: float


class PostgresFeedbackSource:
    """Read feedback using injected backend SQLAlchemy models."""

    def __init__(
        self,
        db: Session,
        feedback_model: type,
        transaction_model: type,
    ):
        self.db = db
        self.feedback_model = feedback_model
        self.transaction_model = transaction_model

    def get_feedback(self) -> list[dict]:
        feedback = self.feedback_model
        transaction = self.transaction_model

        statement = (
            select(feedback, transaction)
            .join(
                transaction,
                feedback.transaction_id == transaction.id,
            )
            .order_by(feedback.created_at, feedback.id)
        )

        rows = self.db.execute(statement).all()
        records = []

        for feedback_row, transaction_row in rows:
            records.append(
                {
                    "transaction_id": str(feedback_row.transaction_id),
                    "operator_id": str(feedback_row.user_id),
                    "label": feedback_row.decision,
                    "submitted_at": (
                        feedback_row.created_at.isoformat()
                        if feedback_row.created_at
                        else None
                    ),
                    "features": {
                        **transaction_row.payload_json,
                        "Amount": transaction_row.amount,
                    },
                }
            )

        return records
