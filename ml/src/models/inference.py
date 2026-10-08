from pathlib import Path

import joblib
import pandas as pd


# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[3]

MODEL_PATH = PROJECT_ROOT / "ml" / "models" / "xgboost_baseline.joblib"
SCALER_PATH = PROJECT_ROOT / "ml" / "models" / "preprocessor.joblib"


# ------------------------------------------------------------
# Load model and scaler
# ------------------------------------------------------------

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)


# ------------------------------------------------------------
# Feature order
# ------------------------------------------------------------

FEATURES = [
    "Time",
    *[f"V{i}" for i in range(1, 29)],
    "Amount",
]


# ------------------------------------------------------------
# Prediction function
# ------------------------------------------------------------

def predict_fraud(transaction: dict) -> float:
    """
    Predict fraud probability for one transaction.

    Input:
        Dictionary containing Time, V1...V28 and Amount.

    Output:
        Fraud probability between 0 and 1.
    """

    # Convert input dictionary to DataFrame
    input_data = pd.DataFrame(
        [[transaction[feature] for feature in FEATURES]],
        columns=FEATURES,
    )

    # Apply the same scaler used during training
    input_scaled = scaler.transform(input_data)

    # Get fraud probability
    fraud_probability = model.predict_proba(input_scaled)[0, 1]

    return float(fraud_probability)