from ml.src.feedback.feedback_labels import FeedbackLabel
from ml.src.feedback.feedback_report import generate_feedback_report
from ml.src.feedback.training_data_builder import FEATURES


def make_features():
    return {feature: 1.0 for feature in FEATURES}


def make_record(transaction_id, label, features=None):
    return {
        "transaction_id": transaction_id,
        "label": label,
        "features": make_features() if features is None else features,
    }


def test_report_counts_eligible_feedback():
    records = [
        make_record("txn-001", FeedbackLabel.CONFIRMED_FRAUD.value),
        make_record("txn-002", FeedbackLabel.CONFIRMED_GENUINE.value),
    ]

    report = generate_feedback_report(records)

    assert report["total_records"] == 2
    assert report["eligible_records"] == 2
    assert report["not_eligible_records"] == 0
    assert report["invalid_records"] == 0


def test_report_counts_disputed_feedback_as_not_eligible():
    records = [
        make_record("txn-001", FeedbackLabel.DISPUTED.value),
    ]

    report = generate_feedback_report(records)

    assert report["eligible_records"] == 0
    assert report["not_eligible_records"] == 1
    assert report["invalid_records"] == 0


def test_report_identifies_invalid_labels():
    records = [
        make_record("txn-001", "UNKNOWN"),
    ]

    report = generate_feedback_report(records)

    assert report["invalid_records"] == 1
    assert report["issues"][0]["reason"] == "Unsupported feedback label"


def test_report_identifies_missing_features():
    records = [
        make_record(
            "txn-001",
            FeedbackLabel.CONFIRMED_FRAUD.value,
            {"Amount": 100.0},
        ),
    ]

    report = generate_feedback_report(records)

    assert report["invalid_records"] == 1
    assert report["issues"][0]["reason"] == "Required features are missing"


def test_report_handles_malformed_records():
    report = generate_feedback_report([None, {}])

    assert report["total_records"] == 2
    assert report["invalid_records"] == 2
    assert len(report["issues"]) == 2
