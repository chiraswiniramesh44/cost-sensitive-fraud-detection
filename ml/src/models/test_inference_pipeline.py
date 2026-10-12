"""Focused inference/pipeline tests using synthetic transactions."""

from pathlib import Path

import joblib
import pytest

from ml.src.decision.cost_matrix import CostMatrix
from ml.src.decision.decision_engine import evaluate_transaction
from ml.src.decision.policy import DecisionPolicy
from ml.src.models.inference import predict_fraud


MODEL_PATH = Path("ml/models/xgboost_baseline.joblib")
PREPROCESSOR_PATH = Path("ml/models/preprocessor.joblib")


def synthetic_transaction(**overrides):
    tx = {
        "Time": 1000.0,
        **{f"V{i}": 0.1 for i in range(1, 29)},
        "Amount": 150.0,
    }
    tx.update(overrides)
    return tx


def test_model_artifacts_exist_and_load():
    assert MODEL_PATH.exists()
    assert PREPROCESSOR_PATH.exists()
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(PREPROCESSOR_PATH)
    assert model is not None
    assert scaler is not None


def test_predict_fraud_returns_probability_in_unit_interval():
    probability = predict_fraud(synthetic_transaction())
    assert isinstance(probability, float)
    assert 0.0 <= probability <= 1.0


def test_predict_fraud_rejects_missing_features():
    tx = synthetic_transaction()
    del tx["Amount"]
    with pytest.raises(ValueError, match="Missing required features"):
        predict_fraud(tx)


def test_predict_fraud_rejects_non_dictionary():
    with pytest.raises(TypeError, match="dictionary"):
        predict_fraud(["not", "a", "dict"])  # type: ignore[arg-type]


def test_predict_fraud_rejects_non_finite_values():
    with pytest.raises(ValueError, match="finite"):
        predict_fraud(synthetic_transaction(Amount=float("nan")))


def test_evaluate_transaction_review_band_with_real_model():
    # Use zero-filled PCA features; scale=2 was measured to land in the
    # review band for approve_threshold=0.10 / block_threshold=0.80.
    tx = {
        "Time": 50000.0,
        "Amount": 500.0,
        **{f"V{i}": 0.0 for i in range(1, 29)},
    }
    tx["V14"] = -2.0
    tx["V12"] = -1.4
    tx["V10"] = -1.0
    tx["V17"] = -0.8
    tx["V4"] = 1.0

    policy = DecisionPolicy(approve_threshold=0.10, block_threshold=0.80)
    cost_matrix = CostMatrix(
        review_cost=1.0,
        block_friction_cost=5.0,
        missed_fraud_cost=100.0,
        residual_risk_cost=20.0,
        block_cost=0.0,
    )

    probability = predict_fraud(tx)
    result = evaluate_transaction(tx, policy, cost_matrix, top_k=3)

    assert 0.10 <= probability < 0.80, (
        f"Fixture probability {probability} left the review band; "
        "update the synthetic features rather than changing thresholds."
    )
    assert result["decision"] == "REVIEW"
    assert result["risk_level"] == "MEDIUM"
    assert result["fraud_probability"] == probability
    assert result["expected_cost"] >= 0
    assert isinstance(result["explanation"], list)
    assert len(result["explanation"]) <= 3


def test_evaluate_transaction_approve_for_low_risk_synthetic():
    policy = DecisionPolicy(approve_threshold=0.10, block_threshold=0.80)
    cost_matrix = CostMatrix(1.0, 5.0, 100.0, 20.0, 0.0)
    result = evaluate_transaction(
        synthetic_transaction(),
        policy,
        cost_matrix,
        top_k=2,
    )
    assert result["decision"] == "APPROVE"
    assert result["fraud_probability"] < 0.10
