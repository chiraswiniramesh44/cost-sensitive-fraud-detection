
import { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["#16a34a", "#d97706", "#dc2626"];

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 3px 12px rgba(15, 23, 42, 0.04)",
  minWidth: 0,
};

function firstNumber(object, keys, fallback = 0) {
  for (const key of keys) {
    const value = object?.[key];
    if (value !== undefined && value !== null && value !== "") {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
  }
  return fallback;
}

function formatCost(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function getProbability(item) {
  return firstNumber(item, [
    "fraud_probability",
    "probability",
    "predicted_probability",
  ], NaN);
}

function getDecision(item) {
  return String(
    item?.decision ?? item?.predicted_decision ?? "UNKNOWN"
  ).toUpperCase();
}

function getRows(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.cases)) return response.cases;
  if (Array.isArray(response?.transactions)) return response.transactions;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function StatCard({ title, value, description }) {
  return (
    <div style={cardStyle}>
      <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>
        {title}
      </p>
      <h2 style={{ fontSize: 28, margin: "12px 0" }}>
        {value}
      </h2>
      <p style={{ color: "#94a3b8", fontSize: 12, margin: 0 }}>
        {description}
      </p>
    </div>
  );
}

export default function RiskAnalytics() {
  const [summary, setSummary] = useState(null);
  const [cost, setCost] = useState(null);
  const [reviewCases, setReviewCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        api.get("/dashboard/summary"),
        api.get("/dashboard/cost"),
        api.get("/review-queue"),
      ]);

      if (!active) return;

      const [summaryResult, costResult, reviewResult] = results;

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value.data);
      }

      if (costResult.status === "fulfilled") {
        setCost(costResult.value.data);
      }

      if (reviewResult.status === "fulfilled") {
        setReviewCases(getRows(reviewResult.value.data));
      }

      if (
        summaryResult.status === "rejected" &&
        costResult.status === "rejected" &&
        reviewResult.status === "rejected"
      ) {
        setError(
          "Analytics could not be loaded from the backend. Check your API connection and login session."
        );
      } else if (
        summaryResult.status === "rejected" ||
        costResult.status === "rejected" ||
        reviewResult.status === "rejected"
      ) {
        setError(
          "Some analytics could not be loaded. The charts may show only the data returned successfully by the backend."
        );
      }

      setLoading(false);
    }

    loadAnalytics();

    return () => {
      active = false;
    };
  }, []);

  const totalTransactions = firstNumber(summary, [
    "total_transactions",
    "transaction_count",
    "total",
  ]);

  const totalPredictions = firstNumber(summary, [
    "total_predictions",
    "prediction_count",
  ]);

  const reviewCount = firstNumber(summary, [
    "review_cases",
    "review_queue",
    "review_count",
  ], reviewCases.length);

  const approvedCount = firstNumber(summary, [
    "approved_transactions",
    "approved_count",
    "approve_count",
  ]);

  const blockedCount = firstNumber(summary, [
    "blocked_transactions",
    "blocked_count",
    "block_count",
  ]);

  const feedbackCount = firstNumber(summary, [
    "feedback_records",
    "feedback_count",
  ]);

  const expectedCost = firstNumber(cost, [
    "expected_cost",
    "total_expected_cost",
    "total_cost",
  ]);

  const decisionData = [
    { name: "Approve", value: approvedCount },
    { name: "Review", value: reviewCount },
    { name: "Block", value: blockedCount },
  ];

  const probabilityData = [
    { range: "0–10%", count: 0 },
    { range: "10–30%", count: 0 },
    { range: "30–50%", count: 0 },
    { range: "50–70%", count: 0 },
    { range: "70–100%", count: 0 },
  ];

  reviewCases.forEach((item) => {
    const probability = getProbability(item);

    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      return;
    }

    const percent = probability * 100;

    if (percent < 10) probabilityData[0].count += 1;
    else if (percent < 30) probabilityData[1].count += 1;
    else if (percent < 50) probabilityData[2].count += 1;
    else if (percent < 70) probabilityData[3].count += 1;
    else probabilityData[4].count += 1;
  });

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-area">
        <Navbar />

        <main className="page-content">
          <div className="page-header">
            <div>
              <h1>Risk Analytics</h1>
              <p>
                Explore transaction probabilities, recorded decisions,
                and expected costs returned by the backend.
              </p>
            </div>

            <span className="data-status">
              {loading ? "LOADING" : error ? "DATA INCOMPLETE" : "LIVE API DATA"}
            </span>
          </div>

          {error && (
            <div className="dashboard-info" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="dashboard-card">
              Loading risk analytics from the backend...
            </div>
          ) : (
            <>
              <p style={{ color: "#64748b", marginBottom: 24 }}>
                Metrics use fields returned by the backend. The probability
                chart uses records returned by the review queue endpoint.
              </p>

              <div
                className="stats-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                <StatCard
                  title="Total Transactions"
                  value={totalTransactions}
                  description="Reported by backend"
                />

                <StatCard
                  title="Total Predictions"
                  value={totalPredictions}
                  description="Predictions recorded by backend"
                />

                <StatCard
                  title="Review Cases"
                  value={reviewCount}
                  description="Reported by backend"
                />

                <StatCard
                  title="Blocked Transactions"
                  value={blockedCount}
                  description="Blocked decisions reported by backend"
                />

                <StatCard
                  title="Approved Transactions"
                  value={approvedCount}
                  description="Approved decisions reported by backend"
                />

                <StatCard
                  title="Feedback Records"
                  value={feedbackCount}
                  description="Feedback records reported by backend"
                />

                <StatCard
                  title="Expected Cost"
                  value={formatCost(expectedCost)}
                  description="Cost returned by backend"
                />
              </div>

              <div
                className="dashboard-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 20,
                  marginTop: 24,
                }}
              >
                <section className="dashboard-card">
                  <h2>Fraud Probability Distribution</h2>
                  <p>
                    Number of returned review cases in each predicted
                    probability range.
                  </p>

                  {reviewCases.length === 0 ? (
                    <p>No review-case records were returned by the backend.</p>
                  ) : (
                    <div style={{ width: "100%", height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={probabilityData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="range" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            name="Review cases"
                            fill="#2563eb"
                            radius={[5, 5, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>

                <section className="dashboard-card">
                  <h2>Decision Distribution</h2>
                  <p>
                    Recorded approve, review, and block decisions.
                  </p>

                  {decisionData.every((item) => item.value === 0) ? (
                    <p>
                      No decision counts were returned by the backend.
                    </p>
                  ) : (
                    <div style={{ width: "100%", height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={decisionData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >
                            {decisionData.map((item, index) => (
                              <Cell
                                key={item.name}
                                fill={COLORS[index]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>
              </div>

              <section
                className="dashboard-card"
                style={{ marginTop: 24 }}
              >
                <h2>Review Cases</h2>
                <p>
                  Cases returned by the backend review queue.
                </p>

                {reviewCases.length === 0 ? (
                  <p>No review cases are available.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        textAlign: "left",
                      }}
                    >
                      <thead>
                        <tr>
                          {[
                            "Transaction ID",
                            "Fraud Probability",
                            "Decision",
                            "Risk Level",
                          ].map((heading) => (
                            <th
                              key={heading}
                              style={{
                                padding: 12,
                                borderBottom: "1px solid #e2e8f0",
                              }}
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {reviewCases.map((item, index) => {
                          const probability = getProbability(item);

                          return (
                            <tr
                              key={
                                item.transaction_id ??
                                item.id ??
                                item.case_id ??
                                index
                              }
                            >
                              <td
                                style={{
                                  padding: 12,
                                  borderBottom: "1px solid #e2e8f0",
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {item.transaction_id ??
                                  item.id ??
                                  item.case_id ??
                                  "N/A"}
                              </td>

                              <td
                                style={{
                                  padding: 12,
                                  borderBottom: "1px solid #e2e8f0",
                                }}
                              >
                                {Number.isFinite(probability)
                                  ? `${(probability * 100).toFixed(2)}%`
                                  : "N/A"}
                              </td>

                              <td
                                style={{
                                  padding: 12,
                                  borderBottom: "1px solid #e2e8f0",
                                }}
                              >
                                {getDecision(item)}
                              </td>

                              <td
                                style={{
                                  padding: 12,
                                  borderBottom: "1px solid #e2e8f0",
                                }}
                              >
                                {item.risk_level ?? item.risk ?? "N/A"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
