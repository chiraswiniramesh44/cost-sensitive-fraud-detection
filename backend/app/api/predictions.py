
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.prediction import Prediction
from backend.app.models.transaction import Transaction
from backend.app.models.user import User
from backend.app.schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
)
from backend.app.services.prediction_service import predict_and_persist


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"],
)


@router.post(
    "/predict",
    response_model=PredictionResponse,
    status_code=status.HTTP_201_CREATED,
)
def predict_transaction(
    request: PredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PredictionResponse:
    """Evaluate a transaction and persist its prediction."""

    result = predict_and_persist(
        db=db,
        request=request,
        current_user=current_user,
    )

    return PredictionResponse(**result)


@router.get("/{transaction_id}")
def get_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Retrieve the current user's transaction and its latest prediction."""

    transaction_query = select(Transaction).where(
        Transaction.user_id == current_user.id
    )

    try:
        transaction_uuid = UUID(transaction_id)
    except ValueError:
        transaction_uuid = None

    if transaction_uuid is not None:
        transaction = db.scalar(
            transaction_query.where(Transaction.id == transaction_uuid)
        )
    else:
        transaction = db.scalar(
            transaction_query.where(
                Transaction.external_id == transaction_id
            )
        )

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )

    prediction = db.scalar(
        select(Prediction)
        .where(Prediction.transaction_id == transaction.id)
        .order_by(
            Prediction.created_at.desc(),
            Prediction.id.desc(),
        )
        .limit(1)
    )

    if prediction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No prediction exists for this transaction.",
        )

    return {
        "transaction_id": str(transaction.id),
        "external_id": transaction.external_id,
        "amount": transaction.amount,
        "features": transaction.payload_json,
        "created_at": transaction.created_at,
        "prediction": {
            "fraud_probability": prediction.probability,
            "risk_level": prediction.risk_level,
            "decision": prediction.decision,
            "expected_cost": prediction.expected_cost,
            "model_version": prediction.model_version,
            "created_at": prediction.created_at,
        },
    }
