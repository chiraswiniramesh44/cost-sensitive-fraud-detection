
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.audit_log import AuditLog
from backend.app.models.prediction import Prediction
from backend.app.models.transaction import Transaction


def persist_prediction(
    db: Session,
    external_id: str,
    features: dict[str, float],
    result: dict[str, Any],
    user_id: UUID | None = None,
) -> dict[str, Any]:
    """Persist a transaction, its prediction, and audit event atomically."""
    try:
        transaction = db.scalar(
            select(Transaction)
            .where(Transaction.external_id == external_id)
            .with_for_update()
        )

        if transaction is None:
            transaction = Transaction(
                external_id=external_id,
                payload_json=features,
                amount=features["Amount"],
            )
            db.add(transaction)
            db.flush()
        else:
            transaction.payload_json = features
            transaction.amount = features["Amount"]
            db.flush()

        prediction = Prediction(
            transaction_id=transaction.id,
            model_version=str(result["model_version"]),
            probability=float(result["fraud_probability"]),
            risk_level=str(result["risk_level"]),
            decision=str(result["decision"]),
            expected_cost=float(result["expected_cost"]),
        )
        db.add(prediction)
        db.flush()

        db.add(
            AuditLog(
                user_id=user_id,
                action="PREDICTION_CREATED",
                entity_type="prediction",
                entity_id=str(prediction.id),
                metadata_json={
                    "transaction_id": str(transaction.id),
                    "external_id": external_id,
                    "decision": prediction.decision,
                    "model_version": prediction.model_version,
                },
            )
        )

        response = {
            "transaction_id": transaction.id,
            "fraud_probability": prediction.probability,
            "risk_level": prediction.risk_level,
            "decision": prediction.decision,
            "expected_cost": prediction.expected_cost,
            "model_version": prediction.model_version,
            "explanation": result["explanation"],
        }

        db.commit()
        return response

    except Exception:
        db.rollback()
        raise
