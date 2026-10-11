
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.models.operator_feedback import OperatorFeedback
from backend.app.models.prediction import Prediction
from backend.app.models.transaction import Transaction
from backend.app.schemas.dashboard import DashboardCost, DashboardSummary


def get_dashboard_summary(db: Session) -> DashboardSummary:
    total_transactions = db.scalar(
        select(func.count()).select_from(Transaction)
    ) or 0

    total_predictions = db.scalar(
        select(func.count()).select_from(Prediction)
    ) or 0

    review_count = db.scalar(
        select(func.count()).select_from(Prediction).where(
            Prediction.decision == "REVIEW"
        )
    ) or 0

    blocked_count = db.scalar(
        select(func.count()).select_from(Prediction).where(
            Prediction.decision == "BLOCK"
        )
    ) or 0

    approved_count = db.scalar(
        select(func.count()).select_from(Prediction).where(
            Prediction.decision == "APPROVE"
        )
    ) or 0

    feedback_count = db.scalar(
        select(func.count()).select_from(OperatorFeedback)
    ) or 0

    return DashboardSummary(
        total_transactions=total_transactions,
        total_predictions=total_predictions,
        review_count=review_count,
        blocked_count=blocked_count,
        approved_count=approved_count,
        feedback_count=feedback_count,
    )


def get_dashboard_cost(db: Session) -> DashboardCost:
    total_cost, prediction_count = db.execute(
        select(
            func.coalesce(func.sum(Prediction.expected_cost), 0.0),
            func.count(Prediction.id),
        )
    ).one()

    total_cost = float(total_cost or 0.0)
    prediction_count = int(prediction_count or 0)

    return DashboardCost(
        total_expected_cost=total_cost,
        average_expected_cost=(
            total_cost / prediction_count if prediction_count else 0.0
        ),
        prediction_count=prediction_count,
    )