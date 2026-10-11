
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.feedback import (
    FeedbackRequest,
    FeedbackResponse,
)
from backend.app.services.feedback_service import submit_feedback

router = APIRouter(
    prefix="/feedback",
    tags=["Operator Feedback"],
)


@router.post(
    "",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_feedback(
    request: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackResponse:
    feedback = submit_feedback(
        db=db,
        request=request,
        current_user=current_user,
    )

    return FeedbackResponse.model_validate(feedback)

