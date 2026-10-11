
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


FeedbackLabel = Literal[
    "CONFIRMED_FRAUD",
    "CONFIRMED_GENUINE",
    "DISPUTED",
    "INCONCLUSIVE",
]


class FeedbackRequest(BaseModel):
    transaction_id: UUID
    operator_decision: FeedbackLabel
    reason_code: str = Field(min_length=1, max_length=100)
    comment: str | None = Field(default=None, max_length=2000)


class FeedbackResponse(BaseModel):
    id: UUID
    transaction_id: UUID
    user_id: UUID
    decision: str
    reason_code: str
    comment: str | None

    model_config = ConfigDict(from_attributes=True)
