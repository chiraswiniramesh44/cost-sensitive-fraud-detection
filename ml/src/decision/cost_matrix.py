from dataclasses import dataclass
from enum import Enum


class Decision(str, Enum):
    APPROVE = "APPROVE"
    REVIEW = "REVIEW"
    BLOCK = "BLOCK"


@dataclass(frozen=True)
class CostMatrix:
    review_cost: float
    block_friction_cost: float
    missed_fraud_cost: float
    residual_risk_cost: float
    block_cost: float

    def expected_cost(self, fraud_probability: float, decision: Decision) -> float:
        if not 0.0 <= fraud_probability <= 1.0:
            raise ValueError("fraud_probability must be between 0 and 1")

        genuine_probability = 1.0 - fraud_probability

        if decision == Decision.APPROVE:
            return fraud_probability * self.missed_fraud_cost

        if decision == Decision.REVIEW:
            return (
                genuine_probability * self.review_cost
                + fraud_probability
                * (self.review_cost + self.residual_risk_cost)
            )

        if decision == Decision.BLOCK:
            return (
                genuine_probability * self.block_friction_cost
                + fraud_probability * self.block_cost
            )

        raise ValueError(f"Unsupported decision: {decision}")