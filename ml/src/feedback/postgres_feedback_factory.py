from sqlalchemy.orm import Session

from ml.src.feedback.postgres_feedback_source import PostgresFeedbackSource


def create_postgres_feedback_source(
    db: Session,
) -> PostgresFeedbackSource:
    """Use the configured application's PostgreSQL session and models."""
    from backend.app.models.operator_feedback import OperatorFeedback
    from backend.app.models.transaction import Transaction

    return PostgresFeedbackSource(
        db=db,
        feedback_model=OperatorFeedback,
        transaction_model=Transaction,
    )
