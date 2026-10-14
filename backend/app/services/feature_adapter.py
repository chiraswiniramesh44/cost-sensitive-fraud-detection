"""
Separate the user-facing transaction schema from the XGBoost feature schema.

The production model expects the ULB Credit Card PCA feature set only:
Time, V1–V28, Amount (see ml/models/model_metadata.json and preprocessor.joblib).

There is NO validated transformation from business fields such as payment method,
merchant category, channel, country, device type, or velocity indicators into
V1–V28. Inventing such a mapping would silently produce unreliable predictions.

INTEGRATION_BLOCKER: business-only inputs must not be scored by the current model.
Keep the existing model working with explicit model-compatible features until a
retrained replacement is available.
"""

from __future__ import annotations

from typing import Any, Mapping

from backend.app.schemas.prediction import FEATURE_NAMES


# Explicit blocker identifier for logs, API errors, and operator documentation.
INTEGRATION_BLOCKER = "BUSINESS_TO_PCA_MAPPING_UNSUPPORTED"

# Fields that may appear in real-world / provider payloads but cannot drive the
# current model. Kept here as the contract for a future retrained model.
FUTURE_BUSINESS_FIELDS = (
    "currency",
    "payment_method",
    "merchant_category",
    "channel",
    "country",
    "customer_reference",
    "device_risk_score",
    "velocity_1h",
    "velocity_24h",
)

SUPPORTED_MODEL_FEATURES = FEATURE_NAMES


class FeatureMappingBlockedError(ValueError):
    """Raised when business fields are offered as a substitute for PCA features."""

    def __init__(self, message: str | None = None) -> None:
        detail = message or (
            f"{INTEGRATION_BLOCKER}: The deployed XGBoost model requires "
            "Time, V1–V28, and Amount. Business-level fields cannot be mapped "
            "to PCA components by the original training pipeline. Provide "
            "model-compatible features (manual advanced entry or CSV), or "
            "retrain on labeled business-feature data before enabling this path."
        )
        super().__init__(detail)
        self.blocker = INTEGRATION_BLOCKER


def is_model_compatible_features(payload: Mapping[str, Any]) -> bool:
    """Return True when the payload contains exactly the model feature names."""
    return set(payload.keys()) >= set(SUPPORTED_MODEL_FEATURES)


def extract_model_features(
    payload: Mapping[str, Any],
) -> dict[str, float]:
    """
    Extract and validate model features from a mixed payload.

    Never substitutes zeros for missing V features.
    """
    missing = [name for name in SUPPORTED_MODEL_FEATURES if name not in payload]
    if missing:
        raise FeatureMappingBlockedError(
            f"{INTEGRATION_BLOCKER}: Missing required model features: {missing}. "
            "Zeros are never substituted for missing PCA features."
        )

    normalized: dict[str, float] = {}
    for name in SUPPORTED_MODEL_FEATURES:
        value = payload[name]
        if isinstance(value, bool):
            raise ValueError(f"{name} must be a finite number")
        try:
            number = float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{name} must be numeric") from exc
        if number != number or number in (float("inf"), float("-inf")):
            raise ValueError(f"{name} must be finite")
        normalized[name] = number
    return normalized


def business_fields_to_model_features(
    business_fields: Mapping[str, Any],
) -> dict[str, float]:
    """
    Intentionally unimplemented adapter hook for a future retrained model.

    Callers must catch FeatureMappingBlockedError and surface it to operators.
    """
    present = [
        key for key in FUTURE_BUSINESS_FIELDS if key in business_fields
    ]
    raise FeatureMappingBlockedError(
        f"{INTEGRATION_BLOCKER}: Refusing to invent a mapping from business "
        f"fields {present or list(business_fields.keys())} to V1–V28. "
        "Retrain with labeled business features, then implement a verified "
        "adapter that replaces this blocker."
    )


def split_payload_metadata(
    payload: Mapping[str, Any],
) -> tuple[dict[str, float] | None, dict[str, Any]]:
    """
    Split a mixed intake payload into model features (if complete) and
    non-model metadata retained for audit / future training.
    """
    metadata = {
        key: value
        for key, value in payload.items()
        if key not in SUPPORTED_MODEL_FEATURES
    }
    if is_model_compatible_features(payload):
        return extract_model_features(payload), metadata
    return None, dict(payload)
