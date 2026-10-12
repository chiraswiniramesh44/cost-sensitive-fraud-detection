"""Tests for GET /feedback listing and service filtering."""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

from fastapi.testclient import TestClient

from backend.app.api.deps import get_current_user, get_db
from backend.app.main import app
from backend.app.services.feedback_service import list_feedback


client = TestClient(app)


def teardown_function():
    app.dependency_overrides.clear()


def test_list_feedback_requires_authentication():
    response = client.get("/feedback")
    assert response.status_code == 401


def test_list_feedback_returns_paginated_items(monkeypatch):
    operator = MagicMock()
    operator.id = uuid4()
    operator.role = "OPERATOR"

    app.dependency_overrides[get_current_user] = lambda: operator
    app.dependency_overrides[get_db] = lambda: MagicMock()

    from backend.app.api import feedback as feedback_api

    row = SimpleNamespace(
        id=uuid4(),
        transaction_id=uuid4(),
        user_id=operator.id,
        decision="CONFIRMED_GENUINE",
        reason_code="MANUAL_REVIEW",
        comment=None,
        created_at=datetime.now(timezone.utc),
    )

    monkeypatch.setattr(
        feedback_api,
        "list_feedback",
        lambda db, limit=50, offset=0, transaction_id=None: ([row], 1),
    )

    response = client.get("/feedback?limit=10&offset=0")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["decision"] == "CONFIRMED_GENUINE"
    assert body["items"][0]["reason_code"] == "MANUAL_REVIEW"
    assert body["limit"] == 10
    assert body["offset"] == 0


def test_list_feedback_service_applies_transaction_filter():
    db = MagicMock()
    db.scalar.return_value = 0
    db.scalars.return_value.all.return_value = []

    transaction_id = uuid4()
    list_feedback(db, limit=25, offset=5, transaction_id=transaction_id)

    count_stmt = db.scalar.call_args.args[0]
    compiled = str(
        count_stmt.compile(compile_kwargs={"literal_binds": True})
    )
    assert "operator_feedback" in compiled.lower()
    assert "transaction_id" in compiled.lower()
    # SQLAlchemy may render UUID literals without hyphens.
    assert transaction_id.hex in compiled.replace("-", "")
