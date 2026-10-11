# Member 2 Handoff — Cost-Sensitive Fraud Detection

## 1. Scope

Member 2 work covers cost-sensitive transaction decisions, review-band
policies, threshold optimization, operator feedback validation, and
research evaluation.

The project uses the ULB Credit Card Fraud Detection dataset and the
Member 1 XGBoost model handoff. The model implementation and artifacts
are maintained separately by Member 1 and must not be replaced here.

## 2. Implemented components

### Decision support
- `ml/src/decision/cost_matrix.py`
- `ml/src/decision/decision_engine.py`
- `ml/src/decision/expected_cost.py`
- `ml/src/decision/policy.py`
- `ml/src/decision/review_band.py`
- `ml/src/decision/review_queue.py`
- `ml/src/decision/threshold_optimizer.py`

### Feedback and training safeguards
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

These components provide decision-cost calculations, feedback validation,
approval-gated training-data preparation, and evaluation of a policy on
approved feedback. Their presence does not by itself establish that a
production retraining or model-promotion workflow is active.

## 3. Research artifacts

Existing files in `ml/reports/` include:
- `cost_sensitivity_results.csv`
- `policy_comparison_results.csv`
- `review_capacity_results.csv`
- `threshold_tuning_experiment.csv`
- `threshold_tuning_experiment_deduplicated.csv`
- `expected_cost_vs_threshold.png`

The recorded policy comparison reports:
- Baseline binary policy expected cost: 2100.0
- Three-way policy expected cost: 1728.0
- Reported cost reduction: 372.0, or approximately 17.71%

These values are the existing experiment outputs, not a guarantee of
future or live production performance. Their dataset split, evaluation
protocol, and cost assumptions should be checked against the associated
research scripts and reports before publication.

The review-capacity experiment records 79 review candidates and evaluates
several capacity limits and overflow strategies. Review precision and
recall vary by capacity and strategy; these should be reported with the
specific settings rather than as universal performance figures.

## 4. Feedback-policy evaluation

`ml/src/feedback/decision_feedback_evaluator.py` evaluates a policy using
approved feedback examples and reports decision/cost metrics.

The evaluator is not evidence of historical production replay. It does
not retrain the model or change live decisions.

## 5. Verification status

The following command was reported as passing:
`python -m pytest ml\src\feedback ml\src\decision -q`

Reported result: 94 passed, 3 warnings, and 11 subtests passed.

The warnings were SHAP-related PendingDeprecationWarnings.

This result covers the feedback and decision test directories only.
A complete end-to-end integration test was not verified during this
handoff. The integration-test source directory was not listed, although
a cached integration-test bytecode file had been observed earlier.
Bytecode alone is not proof that the integration test passes.

## 6. Git status and commits

Reported Member 2 commits:
- `57ccf1a` — Add approved feedback decision evaluator
- `b4303dd` — Test observed costs for approve and block decisions

The last reported working-tree status showed an unrelated modified
`docker-compose.yml`. Preserve that change and do not include it in a
Member 2 documentation commit unless explicitly requested.

Confirm the current branch, commit history, and working-tree status before
creating any additional commit.

## 7. Remaining checks

- Verify the current Git status and branch before committing.
- Confirm whether an integration-test source file should be restored or
  added in coordination with the team.
- Check research scripts and dataset split details before citing the
  reported cost reduction in a paper.
- Coordinate with Member 3 on the live backend/PostgreSQL workflow.
- Coordinate with the team before claiming a complete end-to-end flow.
- Do not rerun protected final-test, model-training, or calibration scripts
  as part of this handoff.

## 8. Model safety

No model retraining, promotion, rollback, or change to live transaction
decisions is claimed by this handoff. Member 1's inference implementation
and model artifacts remain unchanged.
