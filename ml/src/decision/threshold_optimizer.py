from dataclasses import dataclass

import numpy as np

from ml.src.decision.cost_matrix import CostMatrix, Decision


@dataclass(frozen=True)
class ThresholdResult:
    approve_threshold: float
    block_threshold: float
    expected_cost: float
    decisions: dict[str, int]
    review_rate: float


def optimize_threshold(
    fraud_probabilities: np.ndarray,
    actual_labels: np.ndarray,
    cost_matrix: CostMatrix,
    thresholds: np.ndarray | None = None,
    max_review_rate: float | None = None,
) -> ThresholdResult:

    probabilities = np.asarray(
        fraud_probabilities,
        dtype=float,
    )

    labels = np.asarray(
        actual_labels,
        dtype=int,
    )

    if len(probabilities) != len(labels):
        raise ValueError(
            "fraud_probabilities and actual_labels must have the same length"
        )

    if len(probabilities) == 0:
        raise ValueError("Input arrays must not be empty")

    if np.any((probabilities < 0) | (probabilities > 1)):
        raise ValueError(
            "fraud_probabilities must be between 0 and 1"
        )

    if np.any((labels != 0) & (labels != 1)):
        raise ValueError(
            "actual_labels must contain only 0 or 1"
        )

    if thresholds is None:
        thresholds = np.arange(0.01, 1.00, 0.01)

    thresholds = np.asarray(
        thresholds,
        dtype=float,
    )

    if np.any((thresholds <= 0) | (thresholds >= 1)):
        raise ValueError(
            "thresholds must be between 0 and 1"
        )

    if max_review_rate is not None:
        if not 0 <= max_review_rate <= 1:
            raise ValueError(
                "max_review_rate must be between 0 and 1"
            )

    best_result = None
    n = len(probabilities)

    for approve_threshold in thresholds:

        approve = probabilities < approve_threshold

        approve_fraud = int(
            np.sum(approve & (labels == 1))
        )

        approve_count = int(
            np.sum(approve)
        )

        for block_threshold in thresholds:

            if approve_threshold >= block_threshold:
                continue

            block = probabilities >= block_threshold

            block_fraud = int(
                np.sum(block & (labels == 1))
            )

            block_genuine = int(
                np.sum(block & (labels == 0))
            )

            block_count = int(
                np.sum(block)
            )

            review_count = n - approve_count - block_count

            review_fraud = int(
                np.sum(
                    (labels == 1)
                    & ~approve
                    & ~block
                )
            )

            review_genuine = review_count - review_fraud

            review_rate = review_count / n

            if (
                max_review_rate is not None
                and review_rate > max_review_rate
            ):
                continue

            total_cost = (
                approve_fraud
                * cost_matrix.missed_fraud_cost
                + review_genuine
                * cost_matrix.review_cost
                + review_fraud
                * (
                    cost_matrix.review_cost
                    + cost_matrix.residual_risk_cost
                )
                + block_genuine
                * cost_matrix.block_friction_cost
                + block_fraud
                * cost_matrix.block_cost
            )

            counts = {
                Decision.APPROVE.value: approve_count,
                Decision.REVIEW.value: review_count,
                Decision.BLOCK.value: block_count,
            }

            result = ThresholdResult(
                approve_threshold=float(approve_threshold),
                block_threshold=float(block_threshold),
                expected_cost=float(total_cost),
                decisions=counts,
                review_rate=float(review_rate),
            )

            if (
                best_result is None
                or result.expected_cost
                < best_result.expected_cost
            ):
                best_result = result

    if best_result is None:
        raise ValueError(
            "No valid threshold policy satisfies the supplied constraints"
        )

    return best_result