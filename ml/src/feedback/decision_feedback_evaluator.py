import math
from typing import Protocol

from ml.src.decision.cost_matrix import CostMatrix, Decision
from ml.src.decision.policy import DecisionPolicy
from ml.src.feedback.feedback_training_pipeline import (
    build_approved_training_data_from_store,
)
from ml.src.feedback.training_approval import TrainingApproval
from ml.src.feedback.training_data_builder import TrainingExample
from ml.src.models.inference import predict_fraud


class FeedbackSource(Protocol):
    def get_feedback(self) -> list[dict]:
        ...


def _observed_cost(
    label: int,
    decision: Decision,
    costs: CostMatrix,
) -> float:
    if label == 0:
        if decision == Decision.APPROVE:
            return 0.0
        if decision == Decision.REVIEW:
            return costs.review_cost
        if decision == Decision.BLOCK:
            return costs.block_friction_cost

    elif label == 1:
        if decision == Decision.APPROVE:
            return costs.missed_fraud_cost
        if decision == Decision.REVIEW:
            return costs.review_cost + costs.residual_risk_cost
        if decision == Decision.BLOCK:
            return costs.block_cost

    raise ValueError("Unsupported label or decision")


def evaluate_approved_feedback(
    feedback_source: FeedbackSource,
    approval: TrainingApproval | None,
    policy: DecisionPolicy,
    cost_matrix: CostMatrix,
) -> dict:
    if approval is None:
        raise PermissionError(
            "Explicit evaluation approval is required."
        )

    examples: list[TrainingExample] = (
        build_approved_training_data_from_store(
            feedback_source,
            approval,
        )
    )

    if not examples:
        raise ValueError(
            "Evaluation refused: no valid approved feedback examples."
        )

    results = []
    tp = fp = tn = fn = 0
    expected_total = 0.0
    observed_total = 0.0

    for example in examples:
        probability = float(predict_fraud(example.features))

        if (
            not math.isfinite(probability)
            or not 0.0 <= probability <= 1.0
        ):
            raise ValueError(
                f"Invalid fraud probability for {example.transaction_id}"
            )

        decision = policy.decide(probability)
        flagged = decision != Decision.APPROVE
        actual_fraud = example.label == 1

        if flagged and actual_fraud:
            tp += 1
        elif flagged and not actual_fraud:
            fp += 1
        elif not flagged and actual_fraud:
            fn += 1
        else:
            tn += 1

        expected_cost = cost_matrix.expected_cost(
            fraud_probability=probability,
            decision=decision,
        )
        observed_cost = _observed_cost(
            example.label,
            decision,
            cost_matrix,
        )

        expected_total += expected_cost
        observed_total += observed_cost

        results.append(
            {
                "transaction_id": example.transaction_id,
                "actual_label": example.label,
                "fraud_probability": probability,
                "decision": decision.value,
                "expected_cost": expected_cost,
                "observed_cost": observed_cost,
            }
        )

    count = len(results)
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if precision + recall
        else 0.0
    )

    return {
        "evaluation_type": "current_policy_on_approved_feedback",
        "sample_count": count,
        "confusion_counts": {
            "true_positive": tp,
            "false_positive": fp,
            "true_negative": tn,
            "false_negative": fn,
        },
        "intervention_precision": precision,
        "intervention_recall": recall,
        "intervention_f1": f1,
        "total_expected_cost": expected_total,
        "mean_expected_cost": expected_total / count,
        "total_observed_cost": observed_total,
        "mean_observed_cost": observed_total / count,
        "results": results,
        "live_decisions_changed": False,
        "model_retrained": False,
    }
