
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictStr, field_validator


FEATURE_NAMES = (
    "Time",
    *(f"V{i}" for i in range(1, 29)),
    "Amount",
)


class PredictionRequest(BaseModel):
    transaction_id: StrictStr = Field(min_length=1, max_length=100)
    features: dict[str, Any]

    @field_validator("features")
    @classmethod
    def validate_features(cls, value: dict[str, Any]) -> dict[str, Any]:
        expected = set(FEATURE_NAMES)
        supplied = set(value)

        missing = sorted(expected - supplied)
        extra = sorted(supplied - expected)

        if missing:
            raise ValueError(f"Missing required features: {missing}")
        if extra:
            raise ValueError(f"Unexpected features: {extra}")

        normalized: dict[str, float] = {}

        for name in FEATURE_NAMES:
            item = value[name]

            if isinstance(item, bool):
                raise ValueError(f"{name} must be a finite number")

            try:
                number = float(item)
            except (TypeError, ValueError):
                raise ValueError(f"{name} must be numeric") from None

            if not __import__("math").isfinite(number):
                raise ValueError(f"{name} must be finite")

            normalized[name] = number

        return normalized


class FeatureImpact(BaseModel):
    feature: str
    impact: float


class PredictionResponse(BaseModel):
    transaction_id: UUID
    fraud_probability: float = Field(ge=0, le=1)
    risk_level: str
    decision: str
    expected_cost: float
    model_version: str
    explanation: list[FeatureImpact]

    model_config = ConfigDict(from_attributes=True)
