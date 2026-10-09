from typing import Protocol

from ml.src.feedback.training_approval import (
    TrainingApproval,
    filter_approved_feedback,
)
from ml.src.feedback.training_data_builder import (
    TrainingExample,
    build_training_data,
)


class FeedbackSource(Protocol):
    def get_feedback(self) -> list[dict]:
        ...


def build_training_data_from_store(
    feedback_source: FeedbackSource,
) -> list[TrainingExample]:
    feedback_records = feedback_source.get_feedback()
    return build_training_data(feedback_records)


def build_approved_training_data_from_store(
    feedback_source: FeedbackSource,
    approval: TrainingApproval,
) -> list[TrainingExample]:
    feedback_records = feedback_source.get_feedback()
    approved_records = filter_approved_feedback(
        feedback_records,
        approval,
    )
    return build_training_data(approved_records)