# Cost-Sensitive Fraud Detection with Operator Feedback Loop

A machine learning project for credit card fraud detection using cost-sensitive evaluation and an operator feedback loop.

## Member 1: Machine Learning

### Main Model

* Model: XGBoost
* Model version: `xgb-cost-v1`
* Dataset: ULB Credit Card Fraud Detection
* Target column: `Class`
* Input features: `Time`, `V1` to `V28`, and `Amount`

### Important Files

* `ml/src/models/inference.py` - fraud probability prediction interface
* `ml/models/model_metadata.json` - model configuration and metadata
* `ml/reports/member1_handoff.md` - integration handoff instructions
* `ml/reports/member1_ml_report.md` - Member 1 ML report
* `ml/reports/model_selection_decision.md` - model selection rationale
* `ml/reports/final_test_results.csv` - final test metrics

### Python Environment

Use Python 3.12 and create a virtual environment:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Dataset and Model Artifacts

The original dataset, processed CSV files, and trained `.joblib` model artifacts are excluded from Git by `.gitignore`. They must be obtained through the team's agreed file-sharing method or regenerated using the documented ML pipeline before running inference.

Do not commit the original dataset, virtual environment, or large generated files without team agreement.

### Final XGBoost Test Results

* Precision: 0.8125
* Recall: 0.7500
* F1-score: 0.7800
* ROC-AUC: 0.978265
* PR-AUC: 0.768924
* False positives: 9
* False negatives: 13

These results were obtained at a 0.50 classification threshold on the held-out test set. Final business decision thresholds and the operator feedback policy are handled by the relevant project components.

### Team Integration

Member 1 provides fraud probability inference. The cost-sensitive decision policy, explanations, and operator feedback loop must be integrated with this interface without duplicating or silently changing the model preprocessing.
