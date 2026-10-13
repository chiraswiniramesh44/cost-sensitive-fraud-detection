
import { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import transactionService from "../services/transactionService";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const createInitialFeatures = () => ({
  Time: "50000",
  Amount: "500",
  ...Object.fromEntries(
    Array.from({ length: 28 }, (_, index) => [
      `V${index + 1}`,
      "0",
    ])
  ),
});

const COLORS = ["#16a34a", "#dc2626"];

function formatProbability(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0 || number > 1) {
    return "N/A";
  }

  return `${(number * 100).toFixed(2)}%`;
}

function formatCost(value) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? `${number.toFixed(2)} cost units`
    : "N/A";
}

function PredictTransaction() {
  const [features, setFeatures] = useState(createInitialFeatures);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (name, value) => {
    setFeatures((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const numericFeatures = Object.fromEntries(
        Object.entries(features).map(([key, value]) => [
          key,
          Number(value),
        ])
      );

      const response =
        await transactionService.predictTransaction({
          transaction_id: crypto.randomUUID(),
          features: numericFeatures,
        });

      setResult(response);
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : detail
            ? JSON.stringify(detail)
            : "Prediction failed. Check your backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const probability = Number(result?.fraud_probability);

  const validProbability =
    Number.isFinite(probability) &&
    probability >= 0 &&
    probability <= 1;

  const fraudPercent = validProbability ? probability * 100 : 0;

  const decision = String(result?.decision ?? "N/A").toUpperCase();

  const decisionColor =
    decision === "APPROVE"
      ? "#15803d"
      : decision === "BLOCK"
        ? "#dc2626"
        : decision === "REVIEW"
          ? "#d97706"
          : "#475569";

  const probabilityData = validProbability
    ? [
        {
          name: "Non-fraud probability",
          value: 1 - probability,
        },
        {
          name: "Fraud probability",
          value: probability,
        },
      ]
    : [];

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 3px 12px rgba(15,23,42,0.04)",
    minWidth: 0,
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-area">
        <Navbar />

        <main className="page-content">
          <div className="page-header">
            <div>
              <h1>Transaction Fraud Prediction</h1>
              <p>
                Submit transaction features to obtain a prediction from
                the connected backend ML model.
              </p>
            </div>

            <span className="data-status">
              {loading
                ? "PREDICTING"
                : result
                  ? "PREDICTION RECEIVED"
                  : "READY"}
            </span>
          </div>

          {error && (
            <div className="dashboard-info" role="alert">
              <strong>Prediction Error:</strong> {error}
            </div>
          )}

          <section className="dashboard-card">
            <h2>Transaction Details</h2>
            <p>
              Enter the transaction time, amount, and model features.
            </p>

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(145px, 1fr))",
                  gap: 16,
                }}
              >
                {Object.entries(features).map(([name, value]) => (
                  <label
                    key={name}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    {name}

                    <input
                      type="number"
                      step="any"
                      required
                      value={value}
                      onChange={(event) =>
                        handleChange(name, event.target.value)
                      }
                      style={{
                        boxSizing: "border-box",
                        width: "100%",
                        padding: 11,
                        border: "1px solid #cbd5e1",
                        borderRadius: 7,
                      }}
                    />
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 24,
                  padding: "12px 22px",
                  border: 0,
                  borderRadius: 7,
                  background: "#175cd3",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading ? "Predicting..." : "Predict Transaction"}
              </button>
            </form>
          </section>

          {result && (
            <section
              aria-live="polite"
              style={{
                marginTop: 24,
                padding: 24,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
              }}
            >
              <div className="page-header">
                <div>
                  <h2>ML Prediction Results</h2>
                  <p>Results for the submitted transaction</p>
                </div>

                <span
                  style={{
                    background: `${decisionColor}18`,
                    color: decisionColor,
                    padding: "8px 14px",
                    borderRadius: 20,
                    fontWeight: 700,
                  }}
                >
                  {decision}
                </span>
              </div>

              <div className="stats-grid">
                <div style={cardStyle}>
                  <p>Fraud Probability</p>
                  <h2 style={{ color: "#2563eb" }}>
                    {formatProbability(result.fraud_probability)}
                  </h2>
                </div>

                <div style={cardStyle}>
                  <p>Risk Level</p>
                  <h2>{result.risk_level ?? "N/A"}</h2>
                </div>

                <div style={cardStyle}>
                  <p>Expected Cost</p>
                  <h2 style={{ color: "#7c3aed" }}>
                    {formatCost(result.expected_cost)}
                  </h2>
                </div>

                <div style={cardStyle}>
                  <p>Model Version</p>
                  <h3 style={{ overflowWrap: "anywhere" }}>
                    {result.model_version ?? "Not returned by API"}
                  </h3>
                </div>
              </div>

              <div
                className="dashboard-grid"
                style={{ marginTop: 20 }}
              >
                <div className="dashboard-card">
                  <h2>Fraud Probability Chart</h2>

                  {validProbability ? (
                    <>
                      <div
                        style={{
                          width: "100%",
                          height: 250,
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={probabilityData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={85}
                              label={({ name, percent }) =>
                                `${name}: ${(percent * 100).toFixed(2)}%`
                              }
                            >
                              {probabilityData.map((item, index) => (
                                <Cell
                                  key={item.name}
                                  fill={COLORS[index]}
                                />
                              ))}
                            </Pie>

                            <Tooltip
                              formatter={(value) =>
                                `${(Number(value) * 100).toFixed(2)}%`
                              }
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <p>
                        Predicted fraud probability:{" "}
                        {fraudPercent.toFixed(2)}%
                      </p>
                    </>
                  ) : (
                    <p>
                      The API did not return a valid probability between
                      0 and 1.
                    </p>
                  )}
                </div>

                <div className="dashboard-card">
                  <h2>Decision Summary</h2>

                  <div
                    style={{
                      ...cardStyle,
                      marginBottom: 16,
                    }}
                  >
                    <p>Final decision</p>
                    <h2 style={{ color: decisionColor }}>
                      {decision}
                    </h2>
                  </div>

                  <p>
                    <strong>Transaction ID:</strong>
                  </p>

                  <p style={{ overflowWrap: "anywhere" }}>
                    {result.transaction_id ?? "N/A"}
                  </p>

                  <p>
                    <strong>Risk level:</strong>{" "}
                    {result.risk_level ?? "N/A"}
                  </p>

                  <p>
                    <strong>Expected cost:</strong>{" "}
                    {formatCost(result.expected_cost)}
                  </p>
                </div>
              </div>

              {Array.isArray(result.explanation) &&
                result.explanation.length > 0 && (
                  <div
                    className="dashboard-card"
                    style={{ marginTop: 20 }}
                  >
                    <h2>Prediction Explanation</h2>

                    <ul>
                      {result.explanation.map((item, index) => (
                        <li key={`${item.feature}-${index}`}>
                          <strong>{item.feature}:</strong>{" "}
                          {item.impact}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default PredictTransaction;
