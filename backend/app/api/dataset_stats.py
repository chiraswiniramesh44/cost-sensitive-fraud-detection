
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/dataset", tags=["Dataset Statistics"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATASET_PATH = PROJECT_ROOT / "ml" / "data" / "creditcard.csv"


@router.get("/stats")
def get_dataset_stats():
    if not DATASET_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="ML dataset file was not found.",
        )

    try:
        df = pd.read_csv(DATASET_PATH, usecols=["Class"])
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to read the ML dataset.",
        ) from exc

    total = len(df)
    fraud = int((df["Class"] == 1).sum())
    legitimate = int((df["Class"] == 0).sum())

    return {
        "dataset_name": "Credit Card Fraud Dataset",
        "total_transactions": total,
        "legitimate_transactions": legitimate,
        "fraud_transactions": fraud,
        "fraud_percentage": round(
            (fraud / total * 100) if total else 0, 4
        ),
    }
