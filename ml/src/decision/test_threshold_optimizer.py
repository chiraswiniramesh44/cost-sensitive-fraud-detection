import numpy as np

from ml.src.decision.cost_matrix import CostMatrix
from ml.src.decision.threshold_optimizer import optimize_threshold


def test_optimize_threshold():
    probabilities = np.array([0.01, 0.10, 0.40, 0.80, 0.95])
    labels = np.array([0, 0, 1, 1, 1])

    cost_matrix = CostMatrix(
        review_cost=2.0,
        block_friction_cost=5.0,
        missed_fraud_cost=100.0,
        residual_risk_cost=10.0,
        block_cost=20.0,
    )

    result = optimize_threshold(
        fraud_probabilities=probabilities,
        actual_labels=labels,
        cost_matrix=cost_matrix,
        thresholds=np.array([0.2, 0.5, 0.7]),
    )

    assert result.approve_threshold == 0.2
    assert result.block_threshold == 0.5
    assert result.expected_cost == 52.0
    assert result.decisions["APPROVE"] == 2
    assert result.decisions["REVIEW"] == 1
    assert result.decisions["BLOCK"] == 2
    assert result.review_rate == 0.2


def test_max_review_rate():
    probabilities = np.array([0.01, 0.10, 0.40, 0.80, 0.95])
    labels = np.array([0, 0, 1, 1, 1])

    cost_matrix = CostMatrix(
        review_cost=2.0,
        block_friction_cost=5.0,
        missed_fraud_cost=100.0,
        residual_risk_cost=10.0,
        block_cost=20.0,
    )

    result = optimize_threshold(
        fraud_probabilities=probabilities,
        actual_labels=labels,
        cost_matrix=cost_matrix,
        thresholds=np.array([0.2, 0.5, 0.7]),
        max_review_rate=0.2,
    )

    assert result.review_rate <= 0.2


def test_invalid_probabilities():
    probabilities = np.array([0.1, 1.2])
    labels = np.array([0, 1])

    cost_matrix = CostMatrix(
        review_cost=2.0,
        block_friction_cost=5.0,
        missed_fraud_cost=100.0,
        residual_risk_cost=10.0,
        block_cost=20.0,
    )

    with pytest.raises(ValueError):
        optimize_threshold(
            fraud_probabilities=probabilities,
            actual_labels=labels,
            cost_matrix=cost_matrix,
        )


def test_invalid_labels():
    probabilities = np.array([0.1, 0.8])
    labels = np.array([0, 2])

    cost_matrix = CostMatrix(
        review_cost=2.0,
        block_friction_cost=5.0,
        missed_fraud_cost=100.0,
        residual_risk_cost=10.0,
        block_cost=20.0,
    )

    with pytest.raises(ValueError):
        optimize_threshold(
            fraud_probabilities=probabilities,
            actual_labels=labels,
            cost_matrix=cost_matrix,
        )


def test_empty_input():
    probabilities = np.array([])
    labels = np.array([])

    cost_matrix = CostMatrix(
        review_cost=2.0,
        block_friction_cost=5.0,
        missed_fraud_cost=100.0,
        residual_risk_cost=10.0,
        block_cost=20.0,
    )

    with pytest.raises(ValueError):
        optimize_threshold(
            fraud_probabilities=probabilities,
            actual_labels=labels,
            cost_matrix=cost_matrix,
        )

print('All threshold optimizer tests passed')
