from unittest.mock import patch

import pytest

from ml.src.decision.cost_matrix import CostMatrix, Decision
from ml.src.decision.policy import DecisionPolicy
from ml.src.feedback.decision_feedback_evaluator import (
    evaluate_approved_feedback,
)
from ml.src.feedback.feedback_labels import FeedbackLabel
from ml.src.feedback.training_approval import TrainingApproval


FEATURES = {
    "Time": 100.0,
    **{f"V{i}": 0.0 for i in range(1, 29)},
    "Amount": 50.0,
}


class FakeFeedbackSource:
    def __init__(self, records):
        self.records = records

    def get_feedback(self):
        return self.records


@pytest.fixture
def policy():
    return DecisionPolicy(
        approve_threshold=0.3,
        block_threshold=0.7,
    )


@pytest.fixture
def costs():
    return CostMatrix(
        review_cost=2.0,
        block_friction_cost=5.0,
        missed_fraud_cost=100.0,
        residual_risk_cost=10.0,
        block_cost=1.0,
    )


def record(transaction_id, label):
    return {
        "transaction_id": transaction_id,
        "label": label,
        "features": FEATURES.copy(),
    }


def test_requires_explicit_approval(policy, costs):
    source = FakeFeedbackSource([
        record("tx1", FeedbackLabel.CONFIRMED_FRAUD.value)
    ])

    with pytest.raises(PermissionError):
        evaluate_approved_feedback(source, None, policy, costs)


def test_reports_metrics_and_observed_cost(policy, costs):
    source = FakeFeedbackSource([
        record("fraud1", FeedbackLabel.CONFIRMED_FRAUD.value),
        record("genuine1", FeedbackLabel.CONFIRMED_GENUINE.value),
    ])
    approval = TrainingApproval(
        approved_transaction_ids=frozenset({"fraud1", "genuine1"})
    )

    with patch(
        "ml.src.feedback.decision_feedback_evaluator.predict_fraud",
        side_effect=[0.9, 0.1],
    ):
        report = evaluate_approved_feedback(
            source, approval, policy, costs
        )

    assert report["sample_count"] == 2
    assert report["confusion_counts"] == {
        "true_positive": 1,
        "false_positive": 0,
        "true_negative": 1,
        "false_negative": 0,
    }
    assert report["evaluation_type"] == (
    "current_policy_on_approved_feedback"
    )
    assert report["intervention_precision"] == 1.0
    assert report["intervention_recall"] == 1.0
    assert report["intervention_f1"] == 1.0
    assert report["total_observed_cost"] == 1.0
    assert report["live_decisions_changed"] is False
    assert report["model_retrained"] is False


def test_excludes_unapproved_feedback(policy, costs):
    source = FakeFeedbackSource([
        record("approved", FeedbackLabel.CONFIRMED_GENUINE.value),
        record("unapproved", FeedbackLabel.CONFIRMED_FRAUD.value),
    ])
    approval = TrainingApproval(
        approved_transaction_ids=frozenset({"approved"})
    )

    with patch(
        "ml.src.feedback.decision_feedback_evaluator.predict_fraud",
        return_value=0.1,
    ) as predictor:
        report = evaluate_approved_feedback(
            source, approval, policy, costs
        )

    assert report["sample_count"] == 1
    assert predictor.call_count == 1
    assert report["confusion_counts"]["true_negative"] == 1


def test_rejects_empty_approved_dataset(policy, costs):
    source = FakeFeedbackSource([
        record("unapproved", FeedbackLabel.CONFIRMED_FRAUD.value)
    ])
    approval = TrainingApproval(
        approved_transaction_ids=frozenset()
    )

    with pytest.raises(ValueError, match="no valid approved feedback"):
        evaluate_approved_feedback(source, approval, policy, costs)


def test_review_cost_is_reported(policy, costs):
    source = FakeFeedbackSource([
        record("fraud-review", FeedbackLabel.CONFIRMED_FRAUD.value)
    ])
    approval = TrainingApproval(
        approved_transaction_ids=frozenset({"fraud-review"})
    )

    with patch(
        "ml.src.feedback.decision_feedback_evaluator.predict_fraud",
        return_value=0.5,
    ):
        report = evaluate_approved_feedback(
            source, approval, policy, costs
        )

    assert report["results"][0]["decision"] == Decision.REVIEW.value
    assert report["results"][0]["observed_cost"] == 12.0
def test_approve_decision_observed_cost_is_zero_for_genuine(
    policy, costs
):
    source = FakeFeedbackSource([
        record("genuine-approve", FeedbackLabel.CONFIRMED_GENUINE.value)
    ])
    approval = TrainingApproval(
        approved_transaction_ids=frozenset({"genuine-approve"})
    )

    with patch(
        "ml.src.feedback.decision_feedback_evaluator.predict_fraud",
        return_value=0.1,
    ):
        report = evaluate_approved_feedback(
            source, approval, policy, costs
        )

    assert report["results"][0]["decision"] == Decision.APPROVE.value
    assert report["results"][0]["observed_cost"] == 0.0


def test_block_decision_observed_cost_for_genuine_transaction(
    policy, costs
):
    source = FakeFeedbackSource([
        record("genuine-block", FeedbackLabel.CONFIRMED_GENUINE.value)
    ])
    approval = TrainingApproval(
        approved_transaction_ids=frozenset({"genuine-block"})
    )

    with patch(
        "ml.src.feedback.decision_feedback_evaluator.predict_fraud",
        return_value=0.9,
    ):
        report = evaluate_approved_feedback(
            source, approval, policy, costs
        )

    assert report["results"][0]["decision"] == Decision.BLOCK.value
    assert report["results"][0]["observed_cost"] == costs.block_friction_cost
