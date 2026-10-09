import math
from collections import Counter

from ml.src.feedback.feedback_labels import FeedbackLabel
from ml.src.feedback.feedback_validator import validate_feedback
from ml.src.feedback.training_data_builder import FEATURES


def generate_feedback_report(
    feedback_records: list[dict],
) -> dict:
    counts = Counter()
    issues = []

    for index, record in enumerate(feedback_records):
        if not isinstance(record, dict):
            counts["invalid_records"] += 1
            issues.append({
                "record_index": index,
                "reason": "Record must be a dictionary",
            })
            continue

        transaction_id = record.get("transaction_id")

        if transaction_id is None or not str(transaction_id).strip():
            counts["invalid_records"] += 1
            issues.append({
                "record_index": index,
                "reason": "Missing transaction ID",
            })
            continue

        try:
            label = FeedbackLabel(record.get("label"))
        except (ValueError, TypeError):
            counts["invalid_records"] += 1
            issues.append({
                "record_index": index,
                "transaction_id": str(transaction_id).strip(),
                "reason": "Unsupported feedback label",
            })
            continue

        validation = validate_feedback(label)

        if not validation.valid:
            counts["invalid_records"] += 1
            issues.append({
                "record_index": index,
                "transaction_id": str(transaction_id).strip(),
                "reason": validation.reason,
            })
            continue

        if not validation.usable_for_training:
            counts["not_eligible_records"] += 1
            issues.append({
                "record_index": index,
                "transaction_id": str(transaction_id).strip(),
                "reason": validation.reason,
            })
            continue

        features = record.get("features")

        if not isinstance(features, dict):
            counts["invalid_records"] += 1
            issues.append({
                "record_index": index,
                "transaction_id": str(transaction_id).strip(),
                "reason": "Features must be a dictionary",
            })
            continue

        if not all(feature in features for feature in FEATURES):
            counts["invalid_records"] += 1
            issues.append({
                "record_index": index,
                "transaction_id": str(transaction_id).strip(),
                "reason": "Required features are missing",
            })
            continue

        invalid_feature = False

        for feature in FEATURES:
            value = features[feature]

            if isinstance(value, bool):
                invalid_feature = True
                break

            try:
                numeric_value = float(value)
            except (TypeError, ValueError, OverflowError):
                invalid_feature = True
                break

            if not math.isfinite(numeric_value):
                invalid_feature = True
                break

        if invalid_feature:
            counts["invalid_records"] += 1
            issues.append({
                "record_index": index,
                "transaction_id": str(transaction_id).strip(),
                "reason": "Features must contain finite numeric values",
            })
            continue

        counts["eligible_records"] += 1

    total_records = len(feedback_records)

    return {
        "total_records": total_records,
        "eligible_records": counts["eligible_records"],
        "not_eligible_records": counts["not_eligible_records"],
        "invalid_records": counts["invalid_records"],
        "issues": issues,
    }
