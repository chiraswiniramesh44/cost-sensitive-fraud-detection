Cost-Sensitive Fraud Detection with Operator Feedback Loop
A machine learning project for credit card fraud detection using cost-sensitive evaluation and an operator feedback loop.
Member 1: Machine Learning
Main Model
•	Model: XGBoost
•	Model version: xgb-cost-v1
•	Dataset: ULB Credit Card Fraud Detection
•	Target column: Class
•	Input features: Time, V1 to V28, and Amount
Important Files
•	ml/src/models/inference.py - fraud probability prediction interface
•	ml/models/model_metadata.json - model configuration and metadata
•	ml/reports/member1_handoff.md - integration handoff instructions
•	ml/reports/member1_ml_report.md - Member 1 ML report
•	ml/reports/model_selection_decision.md - model selection rationale
•	ml/reports/final_test_results.csv - final test metrics
Python Environment
Use Python 3.12 and create a virtual environment:
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Dataset and Model Artifacts
The original dataset, processed CSV files, and trained .joblib model artifacts are excluded from Git by .gitignore. Obtain them through the team's agreed file-sharing method or regenerate them using the documented ML pipeline before running inference.
Do not commit the original dataset, virtual environment, or large generated files without team agreement.
Final XGBoost Test Results
•	Precision: 0.8125
•	Recall: 0.7500
•	F1-score: 0.7800
•	ROC-AUC: 0.978265
•	PR-AUC: 0.768924
•	False positives: 9
•	False negatives: 13
These results were obtained at a 0.50 classification threshold on the held-out test set. Final business decision thresholds and the operator feedback policy are handled by the relevant project components.
Team Integration
Member 1 provides fraud probability inference. The cost-sensitive decision policy, explanations, and operator feedback loop must be integrated with this interface without duplicating or silently changing model preprocessing.
Shared PostgreSQL Database and API Deployment
The integrated application uses Member 3's FastAPI backend and shared PostgreSQL database. The backend is deployed on Render.
Environment Configuration
1.	Use .env.example as a template for required environment variables.
2.	If .env already exists, update only the required settings; do not overwrite unrelated local configuration.
3.	Set DATABASE_URL to the shared PostgreSQL connection URL supplied by Member 3.
4.	Set JWT_SECRET_KEY to the agreed deployment secret.
5.	Keep .env private and never commit database credentials or secrets.
The expected SQLAlchemy/psycopg URL format is:
postgresql+psycopg://USER:PASSWORD@HOST/DATABASE?sslmode=require
URL-encode reserved characters in credentials where necessary. Share secrets through an approved secrets manager, not source control.
Run the API with Docker Compose
After Member 3 confirms that the environment is configured correctly:
docker compose up --build
The API is exposed locally on port 8000. The deployment Compose configuration uses the external shared database instead of creating a separate local PostgreSQL service.
Database Migration Safety
Do not run alembic upgrade head against the shared database unless Member 3 explicitly coordinates and approves the migration.
Changing DATABASE_URL does not transfer data from a local database. Any required local data transfer must be coordinated separately.
Member 2 Integration
Member 2's responsibilities include cost-sensitive decision support, operator feedback validation, and safeguards for using approved feedback in training. These components must integrate with Member 1's inference interface and Member 3's backend without silently changing model preprocessing or making unauthorized changes to the shared database.
