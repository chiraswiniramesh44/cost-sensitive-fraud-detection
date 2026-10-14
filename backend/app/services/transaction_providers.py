"""
External transaction source adapters.

Credentials stay on the backend. Do not invent provider endpoints.
Mock providers are for automated tests only and must be labeled synthetic.
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from backend.app.schemas.transaction_intake import DataProvenance


@dataclass(frozen=True)
class ProviderTransaction:
    """Normalized provider payload before mapping to intake schemas."""

    external_id: str
    amount: float
    occurred_at: datetime | None = None
    currency: str = "USD"
    payment_method: str | None = None
    merchant_category: str | None = None
    channel: str | None = None
    country: str | None = None
    customer_reference: str | None = None
    # Model-compatible features when a provider or sandbox supplies them.
    model_features: dict[str, float] | None = None
    raw: dict[str, Any] = field(default_factory=dict)
    provenance: DataProvenance = DataProvenance.PROVIDER_SANDBOX
    is_synthetic: bool = False


class ProviderNotConfiguredError(RuntimeError):
    """Raised when required provider credentials or base URL are missing."""


class ProviderRequestError(RuntimeError):
    """Raised on timeouts, rate limits, or malformed provider responses."""


class TransactionProvider(ABC):
    provider_id: str
    required_env: tuple[str, ...] = ()

    def is_configured(self) -> bool:
        return all(os.getenv(name) for name in self.required_env)

    @abstractmethod
    def fetch_recent(self, limit: int = 20) -> list[ProviderTransaction]:
        raise NotImplementedError

    def status_message(self) -> str:
        if not self.required_env:
            return "No credentials required."
        if self.is_configured():
            return "Provider credentials detected."
        missing = [name for name in self.required_env if not os.getenv(name)]
        return (
            "Provider not configured. Set environment variables: "
            + ", ".join(missing)
        )


class UnconfiguredPaymentGatewayProvider(TransactionProvider):
    """
    Placeholder for an approved payment-gateway sandbox.

    Do not invent API URLs or auth schemes. Wire a verified SDK only after
    reviewing the provider's documented API, then map responses here.
    """

    provider_id = "payment_gateway_sandbox"
    required_env = (
        "PAYMENT_GATEWAY_API_KEY",
        "PAYMENT_GATEWAY_BASE_URL",
    )

    def fetch_recent(self, limit: int = 20) -> list[ProviderTransaction]:
        if not self.is_configured():
            raise ProviderNotConfiguredError(self.status_message())
        raise ProviderNotConfiguredError(
            "Payment gateway adapter is scaffolded but not wired to a verified "
            "API. Confirm the provider OpenAPI/SDK contract, then implement "
            "authenticated fetch + schema mapping in this class."
        )


class UnconfiguredExternalFraudApiProvider(TransactionProvider):
    """Placeholder for an authorized external fraud-risk label API."""

    provider_id = "external_fraud_api"
    required_env = (
        "EXTERNAL_FRAUD_API_KEY",
        "EXTERNAL_FRAUD_API_BASE_URL",
    )

    def fetch_recent(self, limit: int = 20) -> list[ProviderTransaction]:
        if not self.is_configured():
            raise ProviderNotConfiguredError(self.status_message())
        raise ProviderNotConfiguredError(
            "External fraud API adapter is scaffolded but not wired to a "
            "verified endpoint. Do not invent URLs; implement after reviewing "
            "the vendor API documentation."
        )


class MockTransactionProvider(TransactionProvider):
    """Test-only synthetic provider. Never present as live traffic."""

    provider_id = "mock_test_provider"
    required_env = ()

    def __init__(self, transactions: list[ProviderTransaction] | None = None):
        self._transactions = transactions or []

    def fetch_recent(self, limit: int = 20) -> list[ProviderTransaction]:
        return list(self._transactions[:limit])


def list_provider_statuses() -> list[dict[str, Any]]:
    providers: list[TransactionProvider] = [
        UnconfiguredPaymentGatewayProvider(),
        UnconfiguredExternalFraudApiProvider(),
    ]
    return [
        {
            "provider_id": provider.provider_id,
            "configured": provider.is_configured(),
            "mode": "unavailable" if not provider.is_configured() else "scaffold",
            "message": provider.status_message(),
            "required_env": list(provider.required_env),
        }
        for provider in providers
    ]


def demo_synthetic_profiles() -> list[dict[str, Any]]:
    """
    Curated synthetic PCA profiles for operator UX demos.

    These are NOT live transactions. Expected decision hints are educational;
    the backend policy remains authoritative at prediction time.
    """
    low_risk = {
        "Time": 50000.0,
        "Amount": 25.0,
        **{f"V{i}": 0.05 for i in range(1, 29)},
    }
    review_risk = {
        "Time": 50000.0,
        "Amount": 500.0,
        **{f"V{i}": 0.0 for i in range(1, 29)},
        "V14": -2.0,
        "V12": -1.4,
        "V10": -1.0,
        "V17": -0.8,
        "V4": 1.0,
    }
    # Strong negative PCA signal historically associated with fraud in ULB data.
    high_risk = {
        "Time": 40000.0,
        "Amount": 1.0,
        **{f"V{i}": 0.0 for i in range(1, 29)},
        "V14": -15.0,
        "V12": -10.0,
        "V10": -8.0,
        "V17": -12.0,
        "V16": -8.0,
        "V3": -8.0,
        "V7": -10.0,
        "V11": 5.0,
        "V4": 5.0,
    }
    return [
        {
            "profile_id": "demo_low_risk",
            "label": "Synthetic low-risk profile",
            "description": (
                "Demo-only PCA vector expected to score below the approve "
                "threshold. Not a live payment."
            ),
            "expected_decision_hint": "APPROVE",
            "is_synthetic": True,
            "features": low_risk,
        },
        {
            "profile_id": "demo_review_band",
            "label": "Synthetic review-band profile",
            "description": (
                "Demo-only PCA vector calibrated for the mid review band "
                "under the 0.02 / 0.98 policy. Not a live payment."
            ),
            "expected_decision_hint": "REVIEW",
            "is_synthetic": True,
            "features": review_risk,
        },
        {
            "profile_id": "demo_high_risk",
            "label": "Synthetic high-risk profile",
            "description": (
                "Demo-only strong PCA fraud signal. A BLOCK outcome is a "
                "model prediction, not confirmed fraud."
            ),
            "expected_decision_hint": "BLOCK",
            "is_synthetic": True,
            "features": high_risk,
        },
    ]


