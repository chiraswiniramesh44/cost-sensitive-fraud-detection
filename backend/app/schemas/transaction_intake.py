"""User-facing transaction intake schemas (separate from model feature schema)."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class DataProvenance(str, Enum):
    """How the transaction entered the system."""

    MODEL_COMPATIBLE_MANUAL = "model_compatible_manual"
    MODEL_COMPATIBLE_CSV = "model_compatible_csv"
    SYNTHETIC_DEMO = "synthetic_demo"
    PROVIDER_SANDBOX = "provider_sandbox"
    PROVIDER_LIVE = "provider_live"


class OutcomeKind(str, Enum):
    """What a displayed label actually means."""

    MODEL_PREDICTION = "model_prediction"
    OPERATOR_REVIEW = "operator_review"
    CONFIRMED_LABEL = "confirmed_label"
    EXTERNAL_VERIFIED_LABEL = "external_verified_label"


class BusinessTransactionMetadata(BaseModel):
    """
    Optional real-world metadata for audit and future retraining.

    These fields are NOT consumed by the current XGBoost model.
    """

    currency: str | None = Field(default="USD", max_length=3)
    payment_method: str | None = Field(default=None, max_length=50)
    merchant_category: str | None = Field(default=None, max_length=100)
    channel: str | None = Field(default=None, max_length=50)
    country: str | None = Field(default=None, max_length=2)
    customer_reference: str | None = Field(
        default=None,
        max_length=64,
        description="Privacy-safe customer/account reference (not PAN/PII).",
    )
    device_risk_score: float | None = Field(default=None, ge=0, le=1)
    velocity_1h: int | None = Field(default=None, ge=0)
    velocity_24h: int | None = Field(default=None, ge=0)
    occurred_at: datetime | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.upper()

    @field_validator("country")
    @classmethod
    def normalize_country(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.upper()


class PredictionProvenance(BaseModel):
    data_provenance: DataProvenance = DataProvenance.MODEL_COMPATIBLE_MANUAL
    outcome_kind: OutcomeKind = OutcomeKind.MODEL_PREDICTION
    is_confirmed_fraud: bool = False
    is_synthetic: bool = False
    notes: str | None = None


class BatchRowResult(BaseModel):
    row_number: int
    external_id: str | None = None
    status: str  # success | error
    transaction_id: UUID | None = None
    fraud_probability: float | None = None
    risk_level: str | None = None
    decision: str | None = None
    expected_cost: float | None = None
    model_version: str | None = None
    error: str | None = None


class BatchPredictionResponse(BaseModel):
    total_rows: int
    success_count: int
    error_count: int
    data_provenance: DataProvenance = DataProvenance.MODEL_COMPATIBLE_CSV
    outcome_kind: OutcomeKind = OutcomeKind.MODEL_PREDICTION
    is_confirmed_fraud: bool = False
    results: list[BatchRowResult]


class RecentTransactionItem(BaseModel):
    transaction_id: UUID
    external_id: str
    amount: float
    created_at: datetime
    fraud_probability: float | None = None
    risk_level: str | None = None
    decision: str | None = None
    model_version: str | None = None
    data_provenance: str | None = None


class DemoProfile(BaseModel):
    """Clearly labeled synthetic profile for operator training — not live data."""

    profile_id: str
    label: str
    description: str
    expected_decision_hint: str
    is_synthetic: bool = True
    features: dict[str, float]


class ProviderStatus(BaseModel):
    provider_id: str
    configured: bool
    mode: str
    message: str
    required_env: list[str] = Field(default_factory=list)
