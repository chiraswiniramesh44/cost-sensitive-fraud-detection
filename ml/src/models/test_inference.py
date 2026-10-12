import pandas as pd

from ml.src.models.inference import predict_fraud


def test_predict_fraud_on_validation_transactions():
    df = pd.read_csv("ml/data/validation_processed.csv")

    assert "Class" in df.columns
    assert not df.empty

    normal_rows = df[df["Class"] == 0]
    fraud_rows = df[df["Class"] == 1]

    assert not normal_rows.empty
    assert not fraud_rows.empty

    normal_transaction = (
        normal_rows.iloc[0].drop("Class").to_dict()
    )
    fraud_transaction = (
        fraud_rows.iloc[0].drop("Class").to_dict()
    )

    normal_probability = predict_fraud(normal_transaction)
    fraud_probability = predict_fraud(fraud_transaction)

    assert 0.0 <= normal_probability <= 1.0
    assert 0.0 <= fraud_probability <= 1.0

