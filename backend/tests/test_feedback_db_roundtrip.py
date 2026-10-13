"""Feedback persistence round-trip against the configured database.

Creates synthetic rows, verifies persistence + retrieval, then deletes only
those synthetic rows. Skips when the database is unavailable.
"""

from uuid import uuid4

import pytest
from sqlalchemy import delete

from backend.app.core.security import hash_password
from backend.app.models.audit_log import AuditLog
from backend.app.models.operator_feedback import OperatorFeedback
from backend.app.models.prediction import Prediction
from backend.app.models.transaction import Transaction
from backend.app.models.user import User
from backend.app.schemas.feedback import FeedbackRequest
from backend.app.services.database_health_service import check_database_connection
from backend.app.services.feedback_service import list_feedback, submit_feedback


def _db_available() -> bool:
    try:
        return check_database_connection()["status"] == "ok"
    except Exception:
        return False


@pytest.mark.skipif(
    not _db_available(),
    reason="Configured database is unavailable",
)
def test_feedback_persists_and_is_retrievable_from_database():
    from backend.app.db.session import SessionLocal

    db = SessionLocal()
    external_id = f"qa-feedback-{uuid4().hex[:12]}"
    email = f"qa-feedback-{uuid4().hex[:8]}@example.com"
    user_id = None
    transaction_id = None
    feedback_id = None

    try:
        user = User(
            email=email,
            password_hash=hash_password("Test-Password-123!"),
            role="OPERATOR",
        )
        db.add(user)
        db.flush()
        user_id = user.id

        transaction = Transaction(
            external_id=external_id,
            payload_json={"Amount": 42.0},
            amount=42.0,
        )
        db.add(transaction)
        db.flush()
        transaction_id = transaction.id

        db.add(
            Prediction(
                transaction_id=transaction.id,
                model_version="xgb-cost-v1",
                probability=0.35,
                risk_level="MEDIUM",
                decision="REVIEW",
                expected_cost=7.5,
            )
        )
        db.commit()

        feedback = submit_feedback(
            db=db,
            request=FeedbackRequest(
                transaction_id=transaction.id,
                operator_decision="CONFIRMED_GENUINE",
                reason_code="QA_DB_ROUNDTRIP",
                comment="synthetic persistence check",
            ),
            current_user=user,
        )
        feedback_id = feedback.id

        rows, total = list_feedback(
            db=db,
            limit=50,
            offset=0,
            transaction_id=transaction.id,
        )

        assert total >= 1
        matched = next(row for row in rows if row.id == feedback.id)
        assert matched.decision == "CONFIRMED_GENUINE"
        assert matched.reason_code == "QA_DB_ROUNDTRIP"
        assert matched.comment == "synthetic persistence check"
        assert matched.user_id == user.id
        assert matched.transaction_id == transaction.id
        assert matched.created_at is not None

    finally:
        try:
            if feedback_id is not None:
                db.execute(
                    delete(OperatorFeedback).where(
                        OperatorFeedback.id == feedback_id
                    )
                )
                db.execute(
                    delete(AuditLog).where(
                        AuditLog.entity_id == str(feedback_id)
                    )
                )
            if transaction_id is not None:
                db.execute(
                    delete(Prediction).where(
                        Prediction.transaction_id == transaction_id
                    )
                )
                db.execute(
                    delete(Transaction).where(
                        Transaction.id == transaction_id
                    )
                )
            if user_id is not None:
                db.execute(
                    delete(AuditLog).where(AuditLog.user_id == user_id)
                )
                db.execute(delete(User).where(User.id == user_id))
            db.commit()
        except Exception:
            db.rollback()
        db.close()
