
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
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
from backend.app.schemas.transaction_intake import (
    BatchPredictionResponse,
    DemoProfile,
    ProviderStatus,
    RecentTransactionItem,
)
from backend.app.services.batch_prediction_service import predict_csv_batch
from backend.app.services.feature_adapter import (
    FeatureMappingBlockedError,
    business_fields_to_model_features,
)
from backend.app.services.prediction_service import predict_and_persist
from backend.app.services.transaction_providers import (
    demo_synthetic_profiles,
    list_provider_statuses,
)


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
    """Evaluate a model-compatible transaction and persist its prediction."""

    result = predict_and_persist(
        db=db,
        request=request,
        current_user=current_user,
    )

    return PredictionResponse(**result)


@router.post(
    "/predict/batch",
    response_model=BatchPredictionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def predict_transactions_batch(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BatchPredictionResponse:
    """
    Batch-score a CSV of model-compatible rows (Time, V1–V28, Amount).

    Business-only CSVs are rejected. Row-level errors do not invent features.
    """
    content = await file.read()
    return predict_csv_batch(
        db=db,
        current_user=current_user,
        data=content,
        filename=file.filename,
    )


@router.get("/recent", response_model=list[RecentTransactionItem])
def list_recent_transactions(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RecentTransactionItem]:
    """Return the current user's most recent transactions with latest prediction."""
    transactions = db.scalars(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
    ).all()

    items: list[RecentTransactionItem] = []
    for transaction in transactions:
        prediction = db.scalar(
            select(Prediction)
            .where(Prediction.transaction_id == transaction.id)
            .order_by(
                Prediction.created_at.desc(),
                Prediction.id.desc(),
            )
            .limit(1)
        )
        meta = {}
        if isinstance(transaction.payload_json, dict):
            meta = transaction.payload_json.get("_meta") or {}

        items.append(
            RecentTransactionItem(
                transaction_id=transaction.id,
                external_id=transaction.external_id,
                amount=transaction.amount,
                created_at=transaction.created_at,
                fraud_probability=(
                    prediction.probability if prediction else None
                ),
                risk_level=prediction.risk_level if prediction else None,
                decision=prediction.decision if prediction else None,
                model_version=(
                    prediction.model_version if prediction else None
                ),
                data_provenance=meta.get("data_provenance"),
            )
        )
    return items


@router.get("/demo-profiles", response_model=list[DemoProfile])
def get_demo_profiles(
    current_user: User = Depends(get_current_user),
) -> list[DemoProfile]:
    """Return clearly labeled synthetic demo profiles (not live payments)."""
    _ = current_user
    return [DemoProfile(**profile) for profile in demo_synthetic_profiles()]


@router.get("/providers/status", response_model=list[ProviderStatus])
def get_provider_status(
    current_user: User = Depends(get_current_user),
) -> list[ProviderStatus]:
    """Report which external transaction providers are configured."""
    _ = current_user
    return [ProviderStatus(**item) for item in list_provider_statuses()]


@router.post("/map-business-features")
def map_business_features_blocked(
    payload: dict,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Explicit integration blocker endpoint.

    Documents that business fields cannot be mapped to V1–V28 by the
    current training pipeline. Always returns 422 with the blocker id.
    """
    _ = current_user
    try:
        business_fields_to_model_features(payload)
    except FeatureMappingBlockedError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "blocker": exc.blocker,
                "message": str(exc),
                "retraining_required": True,
            },
        ) from exc
    raise HTTPException(
        status_code=500,
        detail="Unexpected mapping success without a verified adapter.",
    )


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

    meta = {}
    if isinstance(transaction.payload_json, dict):
        meta = transaction.payload_json.get("_meta") or {}

    return {
        "transaction_id": str(transaction.id),
        "external_id": transaction.external_id,
        "amount": transaction.amount,
        "features": {
            key: value
            for key, value in (transaction.payload_json or {}).items()
            if key != "_meta"
        },
        "created_at": transaction.created_at,
        "data_provenance": meta.get("data_provenance"),
        "is_synthetic": meta.get("is_synthetic", False),
        "prediction": {
            "fraud_probability": prediction.probability,
            "risk_level": prediction.risk_level,
            "decision": prediction.decision,
            "expected_cost": prediction.expected_cost,
            "model_version": prediction.model_version,
            "created_at": prediction.created_at,
            "outcome_kind": "model_prediction",
            "is_confirmed_fraud": False,
        },
    }
