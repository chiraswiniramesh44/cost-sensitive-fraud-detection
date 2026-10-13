
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const chartColors = ["#16a34a", "#f59e0b", "#dc2626"];

const formatNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-IN")
    : String(value);
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      })
    : String(value);
};

const getFirstValue = (object, keys) => {
  for (const key of keys) {
    if (
      object?.[key] !== undefined &&
      object?.[key] !== null &&
      object?.[key] !== ""
    ) {
      return object[key];
    }
  }

  return null;
};

const normalizeCases = (response) => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.transactions)) return response.transactions;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;

  return [];
};

const getTransactionId = (item) =>
  getFirstValue(item, [
    "transaction_id",
    "transactionId",
    "id",
    "prediction_id",
  ]);

const getAmount = (item) =>
  getFirstValue(item, [
    "amount",
    "transaction_amount",
    "transactionAmount",
  ]);

const getProbability = (item) =>
  getFirstValue(item, [
    "fraud_probability",
    "fraudProbability",
    "probability",
    "fraud_score",
    "risk_score",
  ]);

const getDecision = (item) =>
  String(
    getFirstValue(item, [
      "decision",
      "system_decision",
      "predicted_decision",
      "operator_decision",
    ]) ?? "UNKNOWN"
  ).toUpperCase();

const getRisk = (item) => {
  const suppliedRisk = getFirstValue(item, [
    "risk_level",
    "riskLevel",
    "risk_category",
  ]);

  if (suppliedRisk) {
    return String(suppliedRisk).toUpperCase();
  }

  const probability = getProbability(item);

  if (probability === null) return "—";

  let value = Number(probability);

  if (!Number.isFinite(value)) return "—";

  if (value > 1 && value <= 100) {
    value /= 100;
  }

  if (value < 0 || value > 1) return "—";

  if (value >= 0.7) return "HIGH";
  if (value >= 0.3) return "MEDIUM";

  return "LOW";
};

const formatProbability = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  let probability = Number(value);

  if (!Number.isFinite(probability)) return "—";

  if (probability < 0 || probability > 100) return "—";

  if (probability > 1) {
    return `${probability.toFixed(2)}%`;
  }

  return `${(probability * 100).toFixed(2)}%`;
};

function Dashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [cost, setCost] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [datasetStats, setDatasetStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [casesLoading, setCasesLoading] = useState(true);
  const [error, setError] = useState("");
  const [casesError, setCasesError] = useState("");

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setCasesLoading(true);
      setError("");
      setCasesError("");

      const [summaryResult, costResult, casesResult] =
        await Promise.allSettled([
          api.get("/dashboard/summary"),
          api.get("/dashboard/cost"),
          api.get("/review-queue?limit=10&offset=0"),
        ]);

      if (!active) return;

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value.data);
      } else {
        setSummary(null);

        const status = summaryResult.reason?.response?.status;

        setError(
          status === 401
            ? "Your session has expired. Please log in again."
            : summaryResult.reason?.response?.data?.detail ||
                "Unable to load dashboard summary."
        );
      }

      if (costResult.status === "fulfilled") {
        setCost(costResult.value.data);
      } else {
        setCost(null);
      }

      if (casesResult.status === "fulfilled") {
        setRecentCases(normalizeCases(casesResult.value.data));
      } else {
        setRecentCases([]);

        const status = casesResult.reason?.response?.status;

        setCasesError(
          status === 401
            ? "Your session has expired. Please log in again."
            : casesResult.reason?.response?.data?.detail ||
                "Unable to load recent review cases."
        );
      }

      setLoading(false);
      setCasesLoading(false);
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const stats = [
    {
      title: "Total Transactions",
      value: formatNumber(summary?.total_transactions),
      subtitle: "Reported by backend",
    },
    {
      title: "Total Predictions",
      value: formatNumber(summary?.total_predictions),
      subtitle: "Reported by backend",
    },
    {
      title: "Review Queue",
      value: formatNumber(summary?.review_count),
      subtitle: "Reported by backend",
    },
    {
      title: "Approved Transactions",
      value: formatNumber(summary?.approved_count),
      subtitle: "Reported by backend",
    },
    {
      title: "Blocked Transactions",
      value: formatNumber(summary?.blocked_count),
      subtitle: "Reported by backend",
    },
    {
      title: "Feedback Records",
      value: formatNumber(summary?.feedback_count),
      subtitle: "Operator feedback",
    },
  ];

  const decisionData = [
    {
      name: "Approve",
      value: Number(summary?.approved_count) || 0,
    },
    {
      name: "Review",
      value: Number(summary?.review_count) || 0,
    },
    {
      name: "Block",
      value: Number(summary?.blocked_count) || 0,
    },
  ];

  const hasDecisionData = decisionData.some(
    (item) => item.value > 0
  );

  const expectedCost =
    cost?.expected_cost ??
    cost?.total_expected_cost ??
    cost?.total_cost ??
    cost?.cost;

  const displayedCases = [...recentCases]
    .sort((a, b) => {
      const aProbability = Number(getProbability(a));
      const bProbability = Number(getProbability(b));

      if (
        !Number.isFinite(aProbability) ||
        !Number.isFinite(bProbability)
      ) {
        return 0;
      }

      return bProbability - aProbability;
    })
    .slice(0, 5);

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-area">
        <Navbar />

        <main className="page-content">
          <div className="page-header">
            <div>
              <h1>Fraud Detection Dashboard</h1>
              <p>
                Monitor transactions, risk decisions, and operator
                review activity.
              </p>
            </div>

            <span className="data-status">
              {loading
                ? "LOADING DATA"
                : summary
                  ? "LIVE API DATA"
                  : "DATA UNAVAILABLE"}
            </span>
          </div>

          {loading && (
            <div className="dashboard-info">
              <p>Loading dashboard data from the backend...</p>
            </div>
          )}

          {!loading && error && (
            <div className="dashboard-info" role="alert">
              <p>{error}</p>
              <p>
                Check your login session and backend connection,
                then refresh the page.
              </p>
            </div>
          )}

          {!loading && summary && (
            <div className="dashboard-info">
              <p>
                Dashboard figures are retrieved from the authenticated
                backend API. They represent recorded backend data;
                model performance and prediction quality must be
                verified separately.
              </p>
            </div>
          )}

          <section className="stats-grid">
            {stats.map((stat) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={loading ? "..." : stat.value}
                subtitle={stat.subtitle}
              />
            ))}
          </section>

          <section className="dashboard-grid">
            <div className="dashboard-card">
              <h3>Decision Distribution</h3>

              <p>
                Distribution of recorded approve, review, and block
                decisions.
              </p>

              {!loading && summary && hasDecisionData && (
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={decisionData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={95}
                        label
                      >
                        {decisionData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={chartColors[index]}
                          />
                        ))}
                      </Pie>

                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {!loading && summary && !hasDecisionData && (
                <p>No decision records are available to chart yet.</p>
              )}

              {!loading && !summary && (
                <p>Decision distribution is unavailable.</p>
              )}
            </div>

            <div className="dashboard-card">
              <h3>Cost-Sensitive Decision Policy</h3>

              <div className="dashboard-info">
                <p>
                  <strong>APPROVE</strong> — allow a transaction
                  according to the decision policy.
                </p>

                <p>
                  <strong>REVIEW</strong> — send a case for
                  operator assessment.
                </p>

                <p>
                  <strong>BLOCK</strong> — block a transaction
                  according to the decision policy.
                </p>
              </div>

              <h3>Expected Cost</h3>

              <p>
                {loading
                  ? "Loading cost information..."
                  : expectedCost !== undefined && expectedCost !== null
                    ? formatCurrency(expectedCost)
                    : "Cost value unavailable"}
              </p>

              {!cost && !loading && (
                <p>
                  The cost endpoint did not return data. Verify its
                  response format and backend implementation.
                </p>
              )}
            </div>
          </section>

          <section className="dashboard-card">
            <h3>Recent High-Risk Cases</h3>

            <p>
              Review cases returned by the backend, ordered by fraud
              probability when that value is available.
            </p>

            {casesLoading && <p>Loading recent cases...</p>}

            {!casesLoading && casesError && (
              <p role="alert">{casesError}</p>
            )}

            <div className="transaction-table-container">
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Amount</th>
                    <th>Fraud Probability</th>
                    <th>Risk Level</th>
                    <th>Decision</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {!casesLoading &&
                    !casesError &&
                    displayedCases.map((item, index) => {
                      const id = getTransactionId(item);
                      const amount = getAmount(item);
                      const probability = getProbability(item);
                      const risk = getRisk(item);
                      const decision = getDecision(item);

                      return (
                        <tr key={id ?? index}>
                          <td>
                            {id
                              ? `${String(id).slice(0, 12)}...`
                              : "ID unavailable"}
                          </td>

                          <td>
                            {amount !== null
                              ? formatCurrency(amount)
                              : "—"}
                          </td>

                          <td>{formatProbability(probability)}</td>

                          <td>{risk}</td>

                          <td>{decision}</td>

                          <td>
                            {id ? (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/case/${encodeURIComponent(id)}`
                                  )
                                }
                              >
                                View Case
                              </button>
                            ) : (
                              "Unavailable"
                            )}
                          </td>
                        </tr>
                      );
                    })}

                  {!casesLoading &&
                    !casesError &&
                    displayedCases.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          No review cases were returned by the backend.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>

            {recentCases.length > 0 && (
              <p>
                Showing {displayedCases.length} of {recentCases.length}{" "}
                cases returned by the review-queue API.
              </p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
