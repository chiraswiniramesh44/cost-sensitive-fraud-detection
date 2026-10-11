import math
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
    candidates = []

    for record in feedback_records:
        if not isinstance(record, dict):
            continue

        transaction_id = record.get("transaction_id")
        if transaction_id is None:
            continue

        transaction_id = str(transaction_id).strip()
        if not transaction_id:
            continue

        try:
            feedback_label = FeedbackLabel(record.get("label"))
        except (ValueError, TypeError):
            continue

        validation = validate_feedback(feedback_label)
        if not validation.valid or not validation.usable_for_training:
            continue

        features = record.get("features")
        if not isinstance(features, dict):
            continue

        if not all(feature in features for feature in FEATURES):
            continue

        validated_features = {}
        valid_features = True

        for feature in FEATURES:
            value = features[feature]

            if isinstance(value, bool):
                valid_features = False
                break

            try:
                numeric_value = float(value)
            except (TypeError, ValueError, OverflowError):
                valid_features = False
                break

            if not math.isfinite(numeric_value):
                valid_features = False
                break

            validated_features[feature] = numeric_value

        if not valid_features:
            continue

        training_label = (
            1
            if feedback_label == FeedbackLabel.CONFIRMED_FRAUD
            else 0
        )

        candidates.append(
            TrainingExample(
                transaction_id=transaction_id,
                features=validated_features,
                label=training_label,
            )
        )

    grouped = {}

    for example in candidates:
        grouped.setdefault(example.transaction_id, []).append(example)

    training_data = []

    for transaction_id, examples in grouped.items():
        labels = {example.label for example in examples}

        if len(labels) != 1:
            continue

        training_data.append(examples[0])

    return training_data
