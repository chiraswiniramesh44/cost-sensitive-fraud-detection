from pathlib import Path

import pandas as pd

from ml.src.decision.cost_matrix import CostMatrix


PROJECT_ROOT = Path(__file__).resolve().parents[3]

INPUT_PATH = (
    PROJECT_ROOT
    / "ml"
    / "reports"
    / "validation_predictions.csv"
)

OUTPUT_PATH = (
    PROJECT_ROOT
    / "ml"
    / "reports"
    / "policy_comparison_results.csv"
)


COST_MATRIX = CostMatrix(
    review_cost=2.0,
    block_friction_cost=5.0,
    missed_fraud_cost=100.0,
    residual_risk_cost=10.0,
    block_cost=20.0,
)


def evaluate_policy(
    probabilities,
    labels,
    approve_threshold,
    block_threshold,
):
    approve = probabilities < approve_threshold
    block = probabilities >= block_threshold
    review = ~approve & ~block

    approve_fraud = int(((approve) & (labels == 1)).sum())
    review_genuine = int(((review) & (labels == 0)).sum())
    review_fraud = int(((review) & (labels == 1)).sum())
    block_genuine = int(((block) & (labels == 0)).sum())
    block_fraud = int(((block) & (labels == 1)).sum())

    expected_cost = (
        approve_fraud * COST_MATRIX.missed_fraud_cost
        + review_genuine * COST_MATRIX.review_cost
        + review_fraud
        * (
            COST_MATRIX.review_cost
            + COST_MATRIX.residual_risk_cost
        )
        + block_genuine * COST_MATRIX.block_friction_cost
        + block_fraud * COST_MATRIX.block_cost
    )

    total = len(labels)

    return {
        "approve_threshold": approve_threshold,
        "block_threshold": block_threshold,
        "expected_cost": expected_cost,
        "approve_count": int(approve.sum()),
        "review_count": int(review.sum()),
        "block_count": int(block.sum()),
        "review_rate": review.sum() / total,
    }


def main():
    print("=" * 70)
    print("POLICY COMPARISON")
    print("=" * 70)

    if not INPUT_PATH.exists():
        raise FileNotFoundError(
            f"Validation predictions not found: {INPUT_PATH}"
        )

    df = pd.read_csv(INPUT_PATH)

    probabilities = df["xgboost_probability"].to_numpy()
    labels = df["actual_class"].to_numpy()

    policies = [
        {
            "policy": "baseline_0.50",
            "approve_threshold": 0.50,
            "block_threshold": 0.50,
        },
        {
            "policy": "optimized_three_way",
            "approve_threshold": 0.02,
            "block_threshold": 0.98,
        },
    ]

    results = []

    for policy in policies:
        result = evaluate_policy(
            probabilities=probabilities,
            labels=labels,
            approve_threshold=policy["approve_threshold"],
            block_threshold=policy["block_threshold"],
        )

        result["policy"] = policy["policy"]
        results.append(result)

    results_df = pd.DataFrame(results)

    baseline_cost = results_df.loc[
        results_df["policy"] == "baseline_0.50",
        "expected_cost",
    ].iloc[0]

    optimized_cost = results_df.loc[
        results_df["policy"] == "optimized_three_way",
        "expected_cost",
    ].iloc[0]

    cost_reduction = baseline_cost - optimized_cost

    cost_reduction_percentage = (
        cost_reduction / baseline_cost * 100
        if baseline_cost > 0
        else 0.0
    )

    results_df["cost_reduction_vs_baseline"] = 0.0
    results_df["cost_reduction_percentage_vs_baseline"] = 0.0

    results_df.loc[
        results_df["policy"] == "optimized_three_way",
        "cost_reduction_vs_baseline",
    ] = cost_reduction

    results_df.loc[
        results_df["policy"] == "optimized_three_way",
        "cost_reduction_percentage_vs_baseline",
    ] = cost_reduction_percentage

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    results_df.to_csv(
        OUTPUT_PATH,
        index=False,
    )

    print("\nResults:")
    print(results_df.to_string(index=False))

    print("\nCost reduction:")
    print(f"Absolute: {cost_reduction:.2f}")
    print(f"Percentage: {cost_reduction_percentage:.2f}%")

    print("\nResults saved to:")
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()