from typing import Protocol

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