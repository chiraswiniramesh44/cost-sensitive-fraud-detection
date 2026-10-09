
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";

const demoModel = {
  version: "DEMO-1.0",
  algorithm: "XGBoost (illustrative)",
  status: "DEMO ONLY",
  lastUpdated: "Not deployed",
  metrics: [
    { name: "Precision", value: "—" },
    { name: "Recall", value: "—" },
    { name: "F1 Score", value: "—" },
    { name: "PR-AUC", value: "—" },
  ],
};

function ModelMonitoring() {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-area">
        <Navbar />

        <main className="page-content">
          <div className="page-header">
            <div>
              <h1>Model Monitoring</h1>
              <p>
                View model version and deployment information.
              </p>
            </div>

            <span className="data-status">DEMO DATA ONLY</span>
          </div>

          <div className="dashboard-info">
            <p>
              The backend and trained model are not connected.
              No actual model performance measurements are
              available yet.
            </p>
          </div>

          <section className="stats-grid">
            <StatCard
              title="Model Version"
              value={demoModel.version}
              subtitle="Placeholder version"
            />

            <StatCard
              title="Algorithm"
              value="XGBoost"
              subtitle="Illustrative selection only"
            />

            <StatCard
              title="Deployment Status"
              value="Not deployed"
              subtitle="Backend integration pending"
            />

            <StatCard
              title="Last Updated"
              value="—"
              subtitle="No deployed model available"
            />
          </section>

          <section className="dashboard-card">
            <h2>Model Information</h2>

            <div className="model-info-list">
              <p>
                <strong>Version:</strong> {demoModel.version}
              </p>

              <p>
                <strong>Algorithm:</strong> {demoModel.algorithm}
              </p>

              <p>
                <strong>Status:</strong> {demoModel.status}
              </p>

              <p>
                <strong>Last updated:</strong>{" "}
                {demoModel.lastUpdated}
              </p>
            </div>
          </section>

          <section className="dashboard-card">
            <h2>Model Performance Metrics</h2>

            <p>
              Evaluation metrics will appear here after the
              trained model and evaluation results are
              connected.
            </p>

            <div className="stats-grid">
              {demoModel.metrics.map((metric) => (
                <StatCard
                  key={metric.name}
                  title={metric.name}
                  value={metric.value}
                  subtitle="Not measured yet"
                />
              ))}
            </div>
          </section>

          <section className="dashboard-card">
            <h2>Monitoring and Version History</h2>

            <p>
              The completed system should track model
              versions, evaluation results, and updates.
              Retraining should only be enabled after the
              backend implements and validates that workflow.
            </p>

            <p>
              Current status: frontend demonstration only.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default ModelMonitoring;
