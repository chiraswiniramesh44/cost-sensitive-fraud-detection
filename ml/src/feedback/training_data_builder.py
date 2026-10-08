from dataclasses import dataclass

from ml.src.feedback.feedback_labels import FeedbackLabel
from ml.src.feedback.feedback_validator import validate_feedback


FEATURES = [
    "Time",
    *[f"V{i}" for i in range(1, 29)],
    "Amount",
]


@dataclass(frozen=True)
class TrainingExample:
    transaction_id: str
    features: dict[str, float]
    label: int


def build_training_data(
    feedback_records: list[dict],
) -> list[TrainingExample]:
    training_data = []

    for record in feedback_records:
        label = record.get("label")

        try:
            feedback_label = FeedbackLabel(label)
        except (ValueError, TypeError):
            continue

        validation = validate_feedback(feedback_label)

        if not validation.usable_for_training:
            continue

        features = record.get("features")

        if not isinstance(features, dict):
            continue

        if not all(feature in features for feature in FEATURES):
            continue

        training_label = (
            1
            if feedback_label == FeedbackLabel.CONFIRMED_FRAUD
            else 0
        )

        training_data.append(
            TrainingExample(
                transaction_id=str(record["transaction_id"]),
                features={
                    feature: float(features[feature])
                    for feature in FEATURES
                },
                label=training_label,
            )
        )

    return training_data