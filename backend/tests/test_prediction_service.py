"""Prediction-service exception and contract tests."""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from backend.app.schemas.prediction import PredictionRequest
from backend.app.services import prediction_service


def _valid_features():
    return {
        "Time": 1000.0,
        **{f"V{i}": 0.1 for i in range(1, 29)},
        "Amount": 150.0,
    }


def test_evaluate_with_ml_returns_validated_decision_fields():
    fake_result = {
        "fraud_probability": 0.35,
        "risk_level": "MEDIUM",
        "decision": "REVIEW",
        "expected_cost": 7.9,
        "model_version": "xgb-cost-v1",
        "explanation": [{"feature": "V14", "impact": 1.2}],
    }

    with patch.object(
        prediction_service.importlib,
        "import_module",
    ) as import_module:
        decision_module = MagicMock()
        policy_module = MagicMock()
        cost_module = MagicMock()

        policy_module.DecisionPolicy.return_value = MagicMock()
        cost_module.CostMatrix.return_value = MagicMock()
        decision_module.evaluate_transaction.return_value = fake_result

        import_module.side_effect = [
            decision_module,
            policy_module,
            cost_module,
        ]

        result = prediction_service._evaluate_with_ml(_valid_features())

    assert result["decision"] == "REVIEW"
    assert 0.0 <= result["fraud_probability"] <= 1.0


def test_evaluate_with_ml_maps_pipeline_errors_to_http_503():
    with patch.object(
        prediction_service.importlib,
        "import_module",
        side_effect=RuntimeError("simulated pipeline failure"),
    ):
        with pytest.raises(HTTPException) as exc_info:
            prediction_service._evaluate_with_ml(_valid_features())

    assert exc_info.value.status_code == 503
    assert "prediction pipeline is unavailable" in exc_info.value.detail.lower()
    # Client response must not leak the internal exception text.
    assert "simulated pipeline failure" not in exc_info.value.detail


def test_predict_and_persist_propagates_persistence_failure_as_500():
    user = MagicMock()
    user.id = uuid4()
    request = PredictionRequest(
        transaction_id="synth-tx-001",
        features=_valid_features(),
    )

    with patch.object(
        prediction_service,
        "_evaluate_with_ml",
        return_value={
            "fraud_probability": 0.2,
            "risk_level": "MEDIUM",
            "decision": "REVIEW",
            "expected_cost": 5.0,
            "model_version": "xgb-cost-v1",
            "explanation": [],
        },
    ), patch.object(
        prediction_service,
        "persist_prediction",
        side_effect=RuntimeError("db down"),
    ):
        with pytest.raises(HTTPException) as exc_info:
            prediction_service.predict_and_persist(
                db=MagicMock(),
                request=request,
                current_user=user,
            )

    assert exc_info.value.status_code == 500
    assert "could not be persisted" in exc_info.value.detail.lower()
    assert "db down" not in exc_info.value.detail
