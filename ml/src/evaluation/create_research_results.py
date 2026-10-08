import pandas as pd
import matplotlib.pyplot as plt

from pathlib import Path


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

THRESHOLD_RESULTS_PATH = (
    PROJECT_ROOT
    / "ml"
    / "reports"
    / "threshold_analysis_xgboost.csv"
)

OUTPUT_DIR = PROJECT_ROOT / "ml" / "reports"


# ============================================================
# LOAD THRESHOLD RESULTS
# ============================================================

print("=" * 70)
print("RESEARCH RESULTS AND FIGURES")
print("=" * 70)

results = pd.read_csv(THRESHOLD_RESULTS_PATH)

print("\nLoaded threshold results:")
print(f"Rows: {len(results)}")


# ============================================================
# IMPORTANT THRESHOLDS
# ============================================================

baseline = results[
    results["threshold"] == 0.50
].iloc[0]

# ------------------------------------------------------------
# Refined threshold experiment
# ------------------------------------------------------------
# The refined search found two tied minimum-cost thresholds:
# 0.042 and 0.043
#
# Both have expected cost = 980.
# We use 0.042 as the representative threshold for the
# comparison table and explicitly record the tied range.
# ------------------------------------------------------------

refined_threshold_low = 0.042
refined_threshold_high = 0.043
refined_expected_cost = 980

# Values from the refined experiment
refined_FP = 36
refined_FN = 8
refined_TP = 48
refined_TN = 42626

refined_precision = 0.571429
refined_recall = 0.857143
refined_f1 = 0.685714

refined_review_rate = (
    (refined_FP + refined_TP)
    / (refined_FP + refined_TP + refined_TN + refined_FN)
)


# ============================================================
# MODEL COMPARISON TABLE
# ============================================================

model_comparison = pd.DataFrame({
    "Model": [
        "Logistic Regression",
        "Decision Tree",
        "XGBoost"
    ],
    "Threshold": [
        0.50,
        0.50,
        0.50
    ],
    "Precision": [
        0.053170,
        0.030856,
        0.916667
    ],
    "Recall": [
        0.928571,
        0.785714,
        0.785714
    ],
    "F1": [
        0.100580,
        0.059379,
        0.846154
    ],
    "ROC_AUC": [
        0.982786,
        0.818286,
        0.990778
    ],
    "PR_AUC": [
        0.839335,
        0.361544,
        0.858069
    ],
    "FP": [
        926,
        1382,
        4
    ],
    "FN": [
        4,
        12,
        12
    ],
})

MODEL_TABLE_PATH = (
    OUTPUT_DIR / "model_comparison_validation.csv"
)

model_comparison.to_csv(
    MODEL_TABLE_PATH,
    index=False
)


# ============================================================
# COST COMPARISON TABLE
# ============================================================

cost_comparison = pd.DataFrame({
    "Policy": [
        "XGBoost threshold = 0.50",
        "XGBoost refined cost-optimized threshold"
    ],
    "Threshold": [
        baseline["threshold"],
        "0.042-0.043"
    ],
    "FP": [
        baseline["FP"],
        refined_FP
    ],
    "FN": [
        baseline["FN"],
        refined_FN
    ],
    "TP": [
        baseline["TP"],
        refined_TP
    ],
    "TN": [
        baseline["TN"],
        refined_TN
    ],
    "Precision": [
        baseline["precision"],
        refined_precision
    ],
    "Recall": [
        baseline["recall"],
        refined_recall
    ],
    "F1": [
        baseline["f1"],
        refined_f1
    ],
    "Expected_Cost": [
        baseline["expected_cost"],
        refined_expected_cost
    ],
    "Review_Rate": [
        baseline["review_rate"],
        refined_review_rate
    ],
})

COST_TABLE_PATH = (
    OUTPUT_DIR / "cost_policy_comparison.csv"
)

cost_comparison.to_csv(
    COST_TABLE_PATH,
    index=False
)


# ============================================================
# FIGURE 1 — EXPECTED COST VS THRESHOLD
# ============================================================

plt.figure(figsize=(10, 6))

plt.plot(
    results["threshold"],
    results["expected_cost"],
    marker="o",
    markersize=3,
    label="Coarse threshold search"
)

# Baseline threshold
plt.axvline(
    baseline["threshold"],
    linestyle="--",
    label="Baseline threshold = 0.50"
)

# Refined tied thresholds
plt.axvline(
    refined_threshold_low,
    linestyle="--",
    label="Refined minimum = 0.042-0.043"
)

plt.axvline(
    refined_threshold_high,
    linestyle="--"
)

# Mark refined minimum cost
plt.scatter(
    [refined_threshold_low, refined_threshold_high],
    [refined_expected_cost, refined_expected_cost],
    s=80,
    label="Minimum expected cost = 980"
)

plt.xlabel("Decision Threshold")
plt.ylabel("Expected Cost")
plt.title("Expected Cost vs Decision Threshold — XGBoost")
plt.legend()
plt.grid(True)

COST_FIGURE_PATH = (
    OUTPUT_DIR / "expected_cost_vs_threshold.png"
)

plt.savefig(
    COST_FIGURE_PATH,
    dpi=300,
    bbox_inches="tight"
)

plt.close()


# ============================================================
# FIGURE 2 — PRECISION / RECALL VS THRESHOLD
# ============================================================

plt.figure(figsize=(10, 6))

plt.plot(
    results["threshold"],
    results["precision"],
    label="Precision"
)

plt.plot(
    results["threshold"],
    results["recall"],
    label="Recall"
)

plt.axvline(
    refined_threshold_low,
    linestyle="--",
    label="Refined cost-minimum = 0.042-0.043"
)

plt.axvline(
    refined_threshold_high,
    linestyle="--"
)

plt.xlabel("Decision Threshold")
plt.ylabel("Score")
plt.title("Precision and Recall vs Decision Threshold — XGBoost")
plt.legend()
plt.grid(True)

PR_FIGURE_PATH = (
    OUTPUT_DIR / "precision_recall_vs_threshold.png"
)

plt.savefig(
    PR_FIGURE_PATH,
    dpi=300,
    bbox_inches="tight"
)

plt.close()


# ============================================================
# DISPLAY RESULTS
# ============================================================

print("\n" + "=" * 70)
print("MODEL COMPARISON")
print("=" * 70)

print(
    model_comparison.to_string(index=False)
)


print("\n" + "=" * 70)
print("COST POLICY COMPARISON")
print("=" * 70)

print(
    cost_comparison.to_string(index=False)
)


print("\n" + "=" * 70)
print("REFINED COST RESULT")
print("=" * 70)

print("Minimum expected cost: 980")
print("Tied thresholds: 0.042 and 0.043")
print("Baseline expected cost: 1220")
print("Cost reduction: 240")
print("Relative reduction: 19.67%")


print("\n" + "=" * 70)
print("RESEARCH OUTPUTS")
print("=" * 70)

print("\nModel comparison table:")
print(MODEL_TABLE_PATH)

print("\nCost policy table:")
print(COST_TABLE_PATH)

print("\nExpected cost figure:")
print(COST_FIGURE_PATH)

print("\nPrecision/recall figure:")
print(PR_FIGURE_PATH)

print("\n✓ Research results generated successfully.")