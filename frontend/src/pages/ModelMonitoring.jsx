import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import modelService from "../services/modelService";

function ModelMonitoring() {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadModel = async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await modelService.getCurrentModel();

      setModel(response?.data || response);
    } catch (err) {
      console.error(
        "Model monitoring error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to load model information."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModel();
  }, []);

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />

        <div className="main-area">
          <Navbar />

          <main className="page-content">
            <LoadingSpinner message="Loading model information..." />
          </main>
        </div>
      </div>
    );
  }

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
                Monitor the currently deployed fraud
                detection model.
              </p>
            </div>
          </div>

          {error && (
            <ErrorMessage message={error} />
          )}

          {!model && !error ? (
            <EmptyState
              message="No model information available."
            />
          ) : (
            <>
              <section className="stats-grid">
                <StatCard
                  title="Model Version"
                  value={
                    model?.model_version ||
                    model?.version ||
                    "—"
                  }
                  subtitle="Current deployed model"
                />

                <StatCard
                  title="Model Type"
                  value={
                    model?.model_type ||
                    model?.algorithm ||
                    "—"
                  }
                  subtitle="Machine learning model"
                />

                <StatCard
                  title="Model Status"
                  value={
                    model?.status ||
                    "ACTIVE"
                  }
                  subtitle="Deployment status"
                />

                <StatCard
                  title="Last Updated"
                  value={
                    model?.updated_at ||
                    model?.last_updated ||
                    "—"
                  }
                  subtitle="Latest model update"
                />
              </section>

              <section className="dashboard-grid">
                <div className="dashboard-card">
                  <h3>Current Model</h3>

                  <p>
                    <strong>Version:</strong>{" "}
                    {model?.model_version ||
                      model?.version ||
                      "—"}
                  </p>

                  <p>
                    <strong>Algorithm:</strong>{" "}
                    {model?.model_type ||
                      model?.algorithm ||
                      "—"}
                  </p>

                  <p>
                    <strong>Status:</strong>{" "}
                    {model?.status ||
                      "ACTIVE"}
                  </p>
                </div>

                <div className="dashboard-card">
                  <h3>Model Performance</h3>

                  {model?.metrics ? (
                    <div>
                      {Object.entries(
                        model.metrics
                      ).map(
                        ([metric, value]) => (
                          <p key={metric}>
                            <strong>
                              {metric}:
                            </strong>{" "}
                            {String(value)}
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      message="No model performance metrics available."
                    />
                  )}
                </div>
              </section>

              <section className="dashboard-card">
                <h3>Model Monitoring Information</h3>

                <p>
                  This page displays information about
                  the currently deployed fraud detection
                  model and its monitoring metrics.
                </p>

                <p>
                  Model retraining is an optional workflow
                  and should only be enabled when the
                  backend retraining endpoint is ready.
                </p>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default ModelMonitoring;