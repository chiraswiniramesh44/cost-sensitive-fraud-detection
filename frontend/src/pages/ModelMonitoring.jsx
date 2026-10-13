
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import api from "../services/api";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN");
}

function formatMetric(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toFixed(4)
    : String(value);
}

function getModelObject(response) {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data[0] ?? {};
  }

  return data?.item ?? data?.model ?? data?.data ?? data ?? {};
}

function getModelList(response) {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  const items =
    data?.items ??
    data?.models ??
    data?.results ??
    data?.data;

  return Array.isArray(items) ? items : [];
}

function ModelMonitoring() {
  const [model, setModel] = useState(null);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentError, setCurrentError] = useState("");
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadModels() {
      setLoading(true);
      setCurrentError("");
      setHistoryError("");

      const [currentResult, historyResult] =
        await Promise.allSettled([
          api.get("/models/current"),
          api.get("/models"),
        ]);

      if (!active) return;

      if (currentResult.status === "fulfilled") {
        const current = getModelObject(
          currentResult.value
        );

        setModel(
          Object.keys(current).length > 0
            ? current
            : null
        );
      } else {
        setModel(null);

        const error = currentResult.reason;
        setCurrentError(
          error?.response?.data?.detail ??
            error?.message ??
            "Unable to load the current model."
        );
      }

      if (historyResult.status === "fulfilled") {
        setModels(getModelList(historyResult.value));
      } else {
        setModels([]);

        const error = historyResult.reason;
        const statusCode = error?.response?.status;

        setHistoryError(
          statusCode === 403
            ? "Your account does not have permission to view model history. Ask your backend teammate to check the endpoint permissions."
            : error?.response?.data?.detail ??
                error?.message ??
                "Unable to load model history."
        );
      }

      setLoading(false);
    }

    loadModels();

    return () => {
      active = false;
    };
  }, []);

  const version =
    model?.version ??
    model?.model_version ??
    model?.name ??
    "—";

  const artifactPath =
    model?.artifact_path ?? "—";

  const trainedAt =
    model?.trained_at ??
    model?.updated_at ??
    model?.created_at ??
    model?.registered_at;

  const activeStatus =
    typeof model?.active === "boolean"
      ? model.active
        ? "Active"
        : "Inactive"
      : model?.status ??
        model?.deployment_status ??
        "Not reported";

  const algorithm =
    model?.algorithm ??
    model?.model_type ??
    model?.model_name ??
    (String(artifactPath)
      .toLowerCase()
      .includes("xgboost")
      ? "XGBoost (inferred from artifact path)"
      : "Not reported");

  const rawMetrics =
    model?.metrics_json ??
    model?.metrics ??
    model?.evaluation_metrics ??
    model?.performance_metrics ??
    {};

  const metrics =
    rawMetrics &&
    typeof rawMetrics === "object" &&
    !Array.isArray(rawMetrics)
      ? rawMetrics
      : {};

  const metricCards = [
    {
      name: "Precision",
      value: metrics.precision,
    },
    {
      name: "Recall",
      value: metrics.recall,
    },
    {
      name: "F1 Score",
      value: metrics.f1_score ?? metrics.f1,
    },
    {
      name: "PR-AUC",
      value:
        metrics.pr_auc ??
        metrics.average_precision,
    },
    {
      name: "ROC-AUC",
      value: metrics.roc_auc,
    },
  ];

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
                View the active model, artifact information,
                training date, evaluation metrics, and
                available model history.
              </p>
            </div>

            <span className="data-status">
              {loading
                ? "LOADING"
                : model
                  ? "LIVE API DATA"
                  : "DATA UNAVAILABLE"}
            </span>
          </div>

          {currentError && (
            <div className="dashboard-info" role="alert">
              <p>
                Could not load the current model:{" "}
                {String(currentError)}
              </p>
            </div>
          )}

          {loading ? (
            <section className="dashboard-card">
              <p>Loading model information...</p>
            </section>
          ) : (
            <>
              <section className="stats-grid">
                <StatCard
                  title="Model Version"
                  value={version}
                  subtitle="Version returned by backend"
                />

                <StatCard
                  title="Algorithm"
                  value={algorithm}
                  subtitle={
                    model?.algorithm ||
                    model?.model_type ||
                    model?.model_name
                      ? "Reported by backend"
                      : "Inferred from artifact filename or unavailable"
                  }
                />

                <StatCard
                  title="Model Status"
                  value={activeStatus}
                  subtitle={
                    model?.active === true
                      ? "Backend reports this model is active"
                      : model?.active === false
                        ? "Backend reports this model is inactive"
                        : "Status returned by backend"
                  }
                />

                <StatCard
                  title="Training Date"
                  value={formatDate(trainedAt)}
                  subtitle={
                    trainedAt
                      ? "Training timestamp from backend"
                      : "Training date unavailable"
                  }
                />
              </section>

              <section className="dashboard-card">
                <h2>Model Information</h2>

                {model ? (
                  <div className="model-info-list">
                    <p>
                      <strong>Version:</strong>{" "}
                      {version}
                    </p>

                    <p>
                      <strong>Model ID:</strong>{" "}
                      {model.id ??
                        model.model_id ??
                        "—"}
                    </p>

                    <p>
                      <strong>Active:</strong>{" "}
                      {typeof model.active === "boolean"
                        ? model.active
                          ? "Yes"
                          : "No"
                        : "Not reported"}
                    </p>

                    <p>
                      <strong>Algorithm:</strong>{" "}
                      {algorithm}
                    </p>

                    <p>
                      <strong>Artifact Path:</strong>{" "}
                      {artifactPath}
                    </p>

                    <p>
                      <strong>Trained At:</strong>{" "}
                      {formatDate(trainedAt)}
                    </p>
                  </div>
                ) : (
                  <p>
                    No current model information was returned
                    by the backend.
                  </p>
                )}
              </section>

              <section className="dashboard-card">
                <h2>Model Performance Metrics</h2>

                <p>
                  These metrics are displayed only when the
                  backend supplies evaluation results.
                  A dash means that the API did not provide
                  the value.
                </p>

                <div className="stats-grid">
                  {metricCards.map((metric) => (
                    <StatCard
                      key={metric.name}
                      title={metric.name}
                      value={formatMetric(metric.value)}
                      subtitle={
                        metric.value !== undefined &&
                        metric.value !== null
                          ? "Reported by backend"
                          : "Not provided by API"
                      }
                    />
                  ))}
                </div>

                {Object.keys(metrics).length === 0 && (
                  <div className="dashboard-info">
                    <p>
                      The backend returned an empty metrics
                      object. Connect the model evaluation
                      results to display actual performance
                      measurements.
                    </p>
                  </div>
                )}
              </section>

              <section className="dashboard-card">
                <h2>Model Monitoring and Version History</h2>

                {historyError && (
                  <div
                    className="dashboard-info"
                    role="status"
                  >
                    <p>{historyError}</p>
                  </div>
                )}

                {models.length > 0 ? (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Version</th>
                          <th>Model ID</th>
                          <th>Status</th>
                          <th>Artifact Path</th>
                          <th>Trained At</th>
                        </tr>
                      </thead>

                      <tbody>
                        {models.map((item, index) => (
                          <tr
                            key={
                              item.id ??
                              item.model_id ??
                              item.version ??
                              index
                            }
                          >
                            <td>
                              {item.version ??
                                item.model_version ??
                                "—"}
                            </td>

                            <td>
                              {item.id ??
                                item.model_id ??
                                "—"}
                            </td>

                            <td>
                              {typeof item.active === "boolean"
                                ? item.active
                                  ? "Active"
                                  : "Inactive"
                                : item.status ?? "—"}
                            </td>

                            <td>
                              {item.artifact_path ?? "—"}
                            </td>

                            <td>
                              {formatDate(
                                item.trained_at ??
                                  item.updated_at ??
                                  item.created_at
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  !historyError && (
                    <p>
                      No model history records were returned
                      by the backend.
                    </p>
                  )
                )}

                <p>
                  This page reads model information from the
                  backend. It does not train, retrain, or
                  activate models.
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
