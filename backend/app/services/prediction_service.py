
from __future__ import annotations

import importlib
import logging
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.models.user import User
from backend.app.schemas.prediction import PredictionRequest
from backend.app.services.prediction_persistence_service import (
    persist_prediction,
)

logger = logging.getLogger(__name__)


def _evaluate_with_ml(features: dict[str, float]) -> dict[str, Any]:
    """Evaluate a transaction using the existing ML decision engine."""
    try:
        decision_module = importlib.import_module(
            "ml.src.decision.decision_engine"
        )
        policy_module = importlib.import_module(
            "ml.src.decision.policy"
        )
        cost_module = importlib.import_module(
            "ml.src.decision.cost_matrix"
        )

        # Temporary integration defaults.
        # Replace these with the approved project configuration
        # before final research evaluation or benchmarking.
        policy = policy_module.DecisionPolicy(
            approve_threshold=0.10,
            block_threshold=0.80,
        )

        cost_matrix = cost_module.CostMatrix(
            review_cost=1.0,
            block_friction_cost=5.0,
            missed_fraud_cost=100.0,
            residual_risk_cost=20.0,
            block_cost=0.0,
        )

        result = decision_module.evaluate_transaction(
            transaction=features,
            policy=policy,
            cost_matrix=cost_matrix,
            top_k=5,
        )

        if not isinstance(result, dict):
            raise ValueError(
                "Decision engine must return a dictionary."
            )

        required = {
            "fraud_probability",
            "risk_level",
            "decision",
            "expected_cost",
            "model_version",
            "explanation",
        }

        missing = required - set(result)
        if missing:
            raise ValueError(
                f"Decision engine result is missing fields: "
                f"{sorted(missing)}"
            )

        probability = float(result["fraud_probability"])
        expected_cost = float(result["expected_cost"])

        if not 0.0 <= probability <= 1.0:
            raise ValueError(
                "Fraud probability must be between 0 and 1."
            )

        if expected_cost < 0:
            raise ValueError(
                "Expected cost cannot be negative."
            )

        if result["decision"] not in {
            "APPROVE",
            "REVIEW",
            "BLOCK",
        }:
            raise ValueError(
                "Decision engine returned an invalid decision."
            )

        return result

    except HTTPException:
        raise
    except Exception as exc:
        # Print the complete traceback to the API container logs.
        logger.exception("ML prediction pipeline failed")

        # Keep internal exception details out of the client response.
        raise HTTPException(
            status_code=503,
            detail=(
                "The prediction pipeline is unavailable or returned "
                "an invalid result. Check the API container logs "
                "for the underlying exception."
            ),
        ) from exc


def predict_and_persist(
    db: Session,
    request: PredictionRequest,
    current_user: User,
) -> dict[str, Any]:
    """Evaluate a transaction and persist its prediction and audit event."""
    result = _evaluate_with_ml(request.features)

    try:
        return persist_prediction(
            db=db,
            external_id=request.transaction_id,
            features=request.features,
            result=result,
            user_id=current_user.id,
        )
    except Exception as exc:
        logger.exception(
            "Prediction evaluated, but persistence failed"
        )
        raise HTTPException(
            status_code=500,
            detail=(
                "The prediction was evaluated but could not be persisted."
            ),
        ) from exc
