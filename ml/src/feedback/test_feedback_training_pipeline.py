from ml.src.feedback.training_approval import TrainingApproval
from ml.src.feedback.feedback_training_pipeline import (
    build_approved_training_data_from_store,
)
from ml.src.feedback.feedback_labels import FeedbackLabel
from ml.src.feedback.feedback_store import FeedbackStore
from ml.src.feedback.feedback_training_pipeline import (
    build_training_data_from_store,
)
from ml.src.feedback.training_data_builder import FEATURES


def make_features():
    return {
        feature: float(index)
        for index, feature in enumerate(FEATURES)
    }


def test_pipeline_converts_confirmed_feedback(tmp_path):
    store = FeedbackStore(tmp_path / "feedback.sqlite3")

    store.save_feedback(
        transaction_id="txn-001",
        operator_id="operator-1",
        label=FeedbackLabel.CONFIRMED_FRAUD,
        features=make_features(),
    )
    store.save_feedback(
        transaction_id="txn-002",
        operator_id="operator-2",
        label=FeedbackLabel.CONFIRMED_GENUINE,
        features=make_features(),
    )

    examples = build_training_data_from_store(store)

    assert len(examples) == 2
    assert examples[0].transaction_id == "txn-001"
    assert examples[0].label == 1
    assert examples[1].transaction_id == "txn-002"
    assert examples[1].label == 0


def test_pipeline_excludes_disputed_feedback(tmp_path):
    store = FeedbackStore(tmp_path / "feedback.sqlite3")

    store.save_feedback(
        transaction_id="txn-003",
        operator_id="operator-1",
        label=FeedbackLabel.DISPUTED,
        features=make_features(),
    )

    assert build_training_data_from_store(store) == []


def test_pipeline_excludes_inconclusive_feedback(tmp_path):
    store = FeedbackStore(tmp_path / "feedback.sqlite3")

    store.save_feedback(
        transaction_id="txn-004",
        operator_id="operator-1",
        label=FeedbackLabel.INCONCLUSIVE,
        features=make_features(),
    )

    assert build_training_data_from_store(store) == []


def test_pipeline_deduplicates_same_transaction(tmp_path):
    store = FeedbackStore(tmp_path / "feedback.sqlite3")
    features = make_features()

    store.save_feedback(
        transaction_id="txn-005",
        operator_id="operator-1",
        label=FeedbackLabel.CONFIRMED_FRAUD,
        features=features,
    )
    store.save_feedback(
        transaction_id="txn-005",
        operator_id="operator-2",
        label=FeedbackLabel.CONFIRMED_FRAUD,
        features=features,
    )

    examples = build_training_data_from_store(store)

    assert len(examples) == 1
    assert examples[0].transaction_id == "txn-005"


def test_pipeline_excludes_conflicting_labels(tmp_path):
    store = FeedbackStore(tmp_path / "feedback.sqlite3")
    features = make_features()

    store.save_feedback(
        transaction_id="txn-006",
        operator_id="operator-1",
        label=FeedbackLabel.CONFIRMED_FRAUD,
        features=features,
    )
    store.save_feedback(
        transaction_id="txn-006",
        operator_id="operator-2",
        label=FeedbackLabel.CONFIRMED_GENUINE,
        features=features,
    )

    assert build_training_data_from_store(store) == []
def test_approved_pipeline_excludes_unapproved_feedback(tmp_path):
    store = FeedbackStore(tmp_path / "feedback.sqlite3")

    store.save_feedback(
        transaction_id="txn-approved",
        operator_id="operator-1",
        label=FeedbackLabel.CONFIRMED_FRAUD,
        features=make_features(),
    )
    store.save_feedback(
        transaction_id="txn-unapproved",
        operator_id="operator-2",
        label=FeedbackLabel.CONFIRMED_GENUINE,
        features=make_features(),
    )

    approval = TrainingApproval(
        approved_transaction_ids=frozenset({"txn-approved"})
    )

    examples = build_approved_training_data_from_store(
        store,
        approval,
    )

    assert len(examples) == 1
    assert examples[0].transaction_id == "txn-approved"
    assert examples[0].label == 1


def test_approved_pipeline_returns_empty_without_approvals(tmp_path):
    store = FeedbackStore(tmp_path / "feedback.sqlite3")

    store.save_feedback(
        transaction_id="txn-007",
        operator_id="operator-1",
        label=FeedbackLabel.CONFIRMED_FRAUD,
        features=make_features(),
    )

    approval = TrainingApproval(
        approved_transaction_ids=frozenset()
    )

    assert build_approved_training_data_from_store(
        store,
        approval,
    ) == []