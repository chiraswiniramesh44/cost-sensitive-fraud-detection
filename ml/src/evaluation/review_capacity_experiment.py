from pathlib import Path

import pandas as pd

from ml.src.decision.review_band import ReviewBand
from ml.src.decision.review_queue import build_review_queue


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
    / "review_capacity_results.csv"
)


REVIEW_LOWER = 0.02
REVIEW_UPPER = 0.98

CAPACITIES = [5, 10, 25, 50, None]


def run_experiment():
    print("=" * 70)
    print("REVIEW CAPACITY EXPERIMENT")
    print("=" * 70)

    if not INPUT_PATH.exists():
        raise FileNotFoundError(
            f"Validation predictions not found: {INPUT_PATH}"
        )

    df = pd.read_csv(INPUT_PATH)

    if "xgboost_probability" not in df.columns:
        raise ValueError(
            "Missing required column: xgboost_probability"
        )

    probabilities = df["xgboost_probability"].to_numpy()

    results = []

    for capacity in CAPACITIES:
        review_band = ReviewBand(
            lower=REVIEW_LOWER,
            upper=REVIEW_UPPER,
            capacity=capacity,
        )

        queue = build_review_queue(
            fraud_probabilities=probabilities,
            review_band=review_band,
        )

        results.append(
            {
                "capacity": (
                    "unlimited"
                    if capacity is None
                    else capacity
                ),
                "total_candidates": queue.total_candidates,
                "selected_count": len(queue.selected_indices),
                "selected_rate": (
                    len(queue.selected_indices)
                    / len(probabilities)
                ),
            }
        )

    results_df = pd.DataFrame(results)

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

    print("\nResults saved to:")
    print(OUTPUT_PATH)


if __name__ == "__main__":
    run_experiment()