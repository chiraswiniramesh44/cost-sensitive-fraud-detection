# Member 2 Handoff — Cost-Sensitive Fraud Detection

## 1. Scope

Member 2 work covers cost-sensitive transaction decisions, review-band policies, threshold optimization, operator feedback validation, training safeguards, and research evaluation.

The project uses the ULB Credit Card Fraud Detection dataset and the Member 1 XGBoost model handoff. The model implementation and artifacts are maintained separately by Member 1 and must not be replaced here.

## 2. Implemented Components

### Decision Support

- `ml/src/decision/cost_matrix.py`
- `ml/src/decision/decision_engine.py`
- `ml/src/decision/expected_cost.py`
- `ml/src/decision/policy.py`
- `ml/src/decision/review_band.py`
- `ml/src/decision/review_queue.py`
- `ml/src/decision/threshold_optimizer.py`

These components support cost calculations, approval/review/block decisions, review-band policies, review-queue construction, and threshold optimization.

### Feedback and Training Safeguards

- `ml/src/feedback/feedback_labels.py`
- `ml/src/feedback/feedback_validator.py`
- `ml/src/feedback/feedback_store.py`
- `ml/src/feedback/feedback_report.py`
- `ml/src/feedback/training_approval.py`
- `ml/src/feedback/training_data_builder.py`
- `ml/src/feedback/feedback_training_pipeline.py`
- `ml/src/feedback/retraining_guard.py`
- `ml/src/feedback/postgres_feedback_source.py`
- `ml/src/feedback/postgres_feedback_factory.py`
- `ml/src/feedback/decision_feedback_evaluator.py`

These components provide feedback validation, feedback storage and reporting, approval-gated training-data preparation, PostgreSQL feedback-source access, and evaluation of a policy on approved feedback.

The presence of these components does not by itself establish that production retraining, model promotion, rollback, or a live feedback loop is active.

## 3. Research Artifacts and Evaluation Results

Existing research artifacts in `ml/reports/` include:

- `validation_predictions.csv`
- `final_test_results.csv`
- `cost_sensitivity_results.csv`
- `policy_comparison_results.csv`
- `review_capacity_results.csv`
- `threshold_tuning_experiment.csv`
- `threshold_tuning_experiment_deduplicated.csv`
- `expected_cost_vs_threshold.png`

### 3.1 Validation Dataset

The existing `validation_predictions.csv` contains 42,718 transactions:

- Genuine transactions: 42,662
- Fraudulent transactions: 56

The policy-comparison, cost-sensitivity, and review-capacity experiments use this validation prediction file.

### 3.2 Cost Assumptions

The policy comparison uses the following illustrative cost assumptions:

| Cost component | Configured cost units |
|---|---:|
| Reviewing a genuine transaction | 2 |
| Blocking a genuine transaction | 5 |
| Approving a fraudulent transaction (missed fraud) | 100 |
| Reviewing a fraudulent transaction (review cost + residual risk) | 12 |
| Blocking a fraudulent transaction | 20 |

These values are research assumptions used to compare decision policies. They are not verified real-world monetary costs or final production settings.

### 3.3 Policy Comparison

The existing policy-comparison experiment compares a binary policy with a three-way policy.

| Metric | Binary baseline | Three-way policy |
|---|---:|---:|
| Approval threshold | 0.50 | 0.02 |
| Block threshold | 0.50 | 0.98 |
| Approved transactions | 42,670 | 42,601 |
| Transactions reviewed | 0 | 79 |
| Transactions blocked | 48 | 38 |
| Review rate | 0% | Approximately 0.185% |
| Expected cost | 2,100 | 1,728 |

The recorded difference is 372 cost units, equivalent to approximately 17.71% of the baseline cost.

This result is conditional on the validation predictions, configured cost assumptions, and chosen thresholds. It does not establish a production performance improvement or guarantee that the same reduction will occur on other datasets.

### 3.4 Cost-Sensitivity Experiment

The existing cost-sensitivity experiment evaluates three illustrative scenarios.

| Scenario | Missed-fraud cost | Review cost | Approval threshold | Block threshold | Expected cost |
|---|---:|---:|---:|---:|---:|
| Baseline reference | 100 | 2 | 0.02 | 0.98 | 1,728 |
| Higher fraud loss | 200 | 2 | 0.02 | 0.98 | 2,428 |
| High review cost | 100 | 10 | 0.07 | 0.08 | 1,960 |

The results show that changing the assumed costs can change both the reported expected cost and the thresholds selected by the optimizer. The high-review-cost scenario produces a narrower review band under the recorded experiment.

These are existing experiment outputs, not newly measured results or production recommendations.

### 3.5 Review-Capacity Experiment

The review-capacity experiment evaluates capacities of 5, 10, 25, 50, and unlimited review candidates, using three overflow strategies:

- `APPROVE`
- `BLOCK`
- `RISK_THRESHOLD`

The experiment records 79 candidates within the configured review band.

Under unlimited review capacity, the recorded policy reviews 79 transactions, including 11 fraudulent transactions. Under a review capacity of 5, four fraudulent transactions are selected for review.

Review precision, review recall, and expected cost depend on the selected capacity and overflow strategy. Results should therefore be reported with their corresponding settings rather than as universal performance figures.

### 3.6 Separate Final-Test Results

The existing `final_test_results.csv` reports the XGBoost model's classification metrics on the test split at threshold 0.50.

| Metric | Recorded result |
|---|---:|
| Precision | 0.8125 |
| Recall | 0.7500 |
| F1 score | 0.7800 |
| ROC-AUC | 0.978265 |
| PR-AUC | 0.768924 |
| True negatives | 42,660 |
| False positives | 9 |
| False negatives | 13 |
| True positives | 39 |
| Reported expected cost | 1,345 |

These metrics describe the saved binary classification evaluation. They must not be presented as measurements of the three-way validation policy, because the evaluation outputs use different splits or evaluation contexts and different decision settings.

The underlying evaluation scripts and cost definitions should be reviewed before these results are used in a publication.

## 4. Feedback-Policy Evaluation

`ml/src/feedback/decision_feedback_evaluator.py` evaluates a decision policy using approved feedback examples and reports decision and cost metrics.

The feedback-training pipeline includes validation and approval safeguards before feedback examples are prepared for training.

The evaluator is not evidence of historical production replay. It does not, by itself, retrain the model, promote a new model, roll back a deployed model, or change live transaction decisions.

The PostgreSQL feedback-source components require a compatible backend schema and integration contract. Their presence does not prove that a live backend feedback workflow has been verified.

## 5. Verification Status

The following command was previously reported as passing:

`python -m pytest ml\src\feedback ml\src\decision -q`

Reported result:

- 94 passed
- 3 warnings
- 11 subtests passed

The warnings were SHAP-related `Pending Deprecation Warning` messages.

This result covers the feedback and decision test directories. It does not establish that the complete application, PostgreSQL backend, frontend, and model inference flow have passed an end-to-end integration test.

A complete end-to-end integration test was not verified during this handoff. The integration-test source directory was not listed, and a cached integration-test bytecode file observed earlier is not proof that a corresponding test source exists or passes.

## 6. Git Status and Commits

The last verified branch was:

`integration/all-members`

The last verified commits were:

- `93afe84` — Document Member 2 feedback and cost evaluation handoff
- `b4303dd` — Test observed costs for approve and block decisions
- `57ccf1a` — Add approved feedback decision evaluator
- `12310b0` — Add PostgreSQL feedback source factory
- `03dff4c` — Integrate operator feedback training safeguards

The last reported working-tree status showed a pre-existing modified file:

`M docker-compose.yml`

This change must be preserved. It must not be staged, reverted, or included in a Member 2 documentation commit unless explicitly requested.

Confirm the current branch, commit history, and working-tree status before creating another commit. No push is claimed by this handoff.

## 7. Remaining Checks

- Verify Git status and branch before committing documentation changes.
- Review the integration-test source and coordinate with the team before adding or restoring integration tests.
- Verify dataset split details and evaluation protocols before citing policy results in a paper.
- Confirm the cost definitions used by the threshold optimizer, policy comparison, review-capacity experiment, and final-test evaluation are documented consistently.
- Coordinate with Member 3 to confirm the backend/PostgreSQL schema and feedback integration contract.
- Verify the complete model-to-decision-to-feedback flow before claiming end-to-end integration.
- Do not rerun protected model-training, final-test evaluation, calibration, or result-saving scripts as part of this documentation update.
- Do not stage, revert, or modify the pre-existing `docker-compose.yml` change.
- Do not push changes without explicit approval.

## 8. Model Safety and Ownership

Member 1's inference implementation and model artifacts remain separately maintained and must not be replaced as part of Member 2's work.

No model retraining, promotion, rollback, or change to live transaction decisions is claimed by this handoff.

The recorded cost reductions are research results under specified validation data and illustrative cost assumptions. They are not guarantees of production performance.

## 9. Summary

Member 2 has implemented decision-cost evaluation, review-band policies, threshold optimization, feedback validation, training approval safeguards, feedback-policy evaluation, and research experiments.

The recorded validation policy comparison reports a reduction from 2,100 to 1,728 cost units under its configured assumptions. Cost-sensitivity and review-capacity experiments further demonstrate that decision outcomes depend on the cost settings, thresholds, review capacity, and overflow policy.

Remaining work is to confirm research methodology, coordinate the backend integration contract, verify end-to-end tests, and preserve the existing team-owned changes and model artifacts.
