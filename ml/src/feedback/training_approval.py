from dataclasses import dataclass


@dataclass(frozen=True)
class TrainingApproval:
    approved_transaction_ids: frozenset[str]


def filter_approved_feedback(
    feedback_records: list[dict],
    approval: TrainingApproval,
) -> list[dict]:
    approved_records = []

    for record in feedback_records:
        if not isinstance(record, dict):
            continue

        transaction_id = record.get("transaction_id")

        if transaction_id is None:
            continue

        normalized_id = str(transaction_id).strip()

        if not normalized_id:
            continue

        if normalized_id not in approval.approved_transaction_ids:
            continue

        approved_records.append(record)

    return approved_records