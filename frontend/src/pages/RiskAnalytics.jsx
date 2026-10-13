
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#16a34a", "#f59e0b", "#dc2626"];

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString("en-IN")
    : "—";
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);

  return Number.isFinite(number)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(number)
    : "—";
}

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.transactions)) return data.transactions;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getProbability(item) {
  const raw = item?.fraud_probability;

  if (raw === null || raw === undefined || raw === "") return null;

  const probability = Number(raw);

  if (!Number.isFinite(probability)) return null;

  if (probability >= 0 && probability <= 1) return probability;

  if (probability > 1 && probability <= 100) return probability / 100;

  return null;
}

function getDecision(item) {
  const raw = String(item?.decision ?? "").trim().toUpperCase();

  if (["APPROVE", "APPROVED"].includes(raw)) return "Approve";
  if (["REVIEW", "REVIEW_REQUIRED"].includes(raw)) return "Review";
  if (["BLOCK", "BLOCKED"].includes(raw)) return "Block";

  return null;
}

function RiskAnalytics() {
  const [summary, setSummary] = useState(null);
  const [cost, setCost] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedRange, setSelectedRange] = useState("all");
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
        api.get("/review-queue", {
          params: { limit: 200, offset: 0 },
        }),
      ]);

      if (!active) return;

      const [summaryResult, costResult, queueResult] = results;
      const errors = [];

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value.data);
      } else {
        setSummary(null);
        errors.push("Dashboard summary");
      }

      if (costResult.status === "fulfilled") {
        setCost(costResult.value.data);
      } else {
        setCost(null);
        errors.push("Expected cost");
      }

      if (queueResult.status === "fulfilled") {
        setTransactions(getList(queueResult.value.data));
      } else {
        setTransactions([]);
        errors.push("Review queue");
      }

      if (errors.length > 0) {
        setError(`Unable to load: ${errors.join(", ")}.`);
      }

      setLoading(false);
    }

    loadAnalytics();

    return () => {
      active = false;
    };
  }, []);

  const probabilityData = useMemo(() => {
    const ranges = [
      { range: "0–20%", min: 0, max: 0.2, count: 0 },
      { range: "20–40%", min: 0.2, max: 0.4, count: 0 },
      { range: "40–60%", min: 0.4, max: 0.6, count: 0 },
      { range: "60–80%", min: 0.6, max: 0.8, count: 0 },
      { range: "80–100%", min: 0.8, max: 1.000001, count: 0 },
    ];

    transactions.forEach((item) => {
      const probability = getProbability(item);
      if (probability === null) return;

      const bucket = ranges.find(
        (range) =>
          probability >= range.min && probability < range.max
      );

      if (bucket) bucket.count += 1;
    });

    if (selectedRange === "high") {
      return ranges
        .filter((item) => item.min >= 0.6)
        .map(({ range, count }) => ({ range, count }));
    }

    if (selectedRange === "medium") {
      return ranges
        .filter((item) => item.range === "40–60%")
        .map(({ range, count }) => ({ range, count }));
    }

    return ranges.map(({ range, count }) => ({ range, count }));
  }, [transactions, selectedRange]);

  const decisionData = useMemo(() => {
    const counts = {
      Approve: 0,
      Review: 0,
      Block: 0,
    };

    transactions.forEach((item) => {
      const decision = getDecision(item);
      if (decision) counts[decision] += 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [transactions]);

  const costEntries = useMemo(() => {
    if (!cost) return [];

    const average = Number(cost.average_expected_cost);
    const total = Number(cost.total_expected_cost);

    return [
      ...(Number.isFinite(average)
        ? [{ category: "Average Cost", cost: average }]
        : []),
      ...(Number.isFinite(total)
        ? [{ category: "Total Cost", cost: total }]
        : []),
    ];
  }, [cost]);

  const hasProbabilities = transactions.some(
    (item) => getProbability(item) !== null
  );

  const hasDecisions = decisionData.some((item) => item.value > 0);

  const totalTransactions = summary?.total_transactions;
  const totalPredictions = summary?.total_predictions;
  const reviewCount = summary?.review_count;
  const blockedCount = summary?.blocked_count;
  const approvedCount = summary?.approved_count;
  const feedbackCount = summary?.feedback_count;

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
              {loading
                ? "LOADING DATA"
                : error
                  ? "PARTIAL DATA"
                  : "LIVE API DATA"}
            </span>
          </div>

          {error && (
            <div className="dashboard-info" role="alert">
              <p>{error}</p>
            </div>
          )}

          <div className="dashboard-info">
            <p>
              Metrics use verified backend fields. Probability and decision
              charts describe the returned review-queue records and may not
              represent every prediction.
            </p>
          </div>

          <section className="stats-grid">
            <StatCard
              title="Total Transactions"
              value={loading ? "..." : formatNumber(totalTransactions)}
              subtitle="Reported by backend"
            />

            <StatCard
              title="Total Predictions"
              value={loading ? "..." : formatNumber(totalPredictions)}
              subtitle="Predictions recorded by backend"
            />

            <StatCard
              title="Review Cases"
              value={loading ? "..." : formatNumber(reviewCount)}
              subtitle="Reported by backend"
            />

            <StatCard
              title="Blocked Transactions"
              value={loading ? "..." : formatNumber(blockedCount)}
              subtitle="Blocked decisions reported by backend"
            />

            <StatCard
              title="Approved Transactions"
              value={loading ? "..." : formatNumber(approvedCount)}
              subtitle="Approved decisions reported by backend"
            />

            <StatCard
              title="Feedback Records"
              value={loading ? "..." : formatNumber(feedbackCount)}
              subtitle="Feedback records reported by backend"
            />

            <StatCard
              title="Expected Cost"
              value={loading ? "..." : formatCurrency(cost?.total_expected_cost)}
              subtitle="Total expected cost from backend"
            />
          </section>

          <section className="dashboard-card">
            <div className="analytics-heading">
              <div>
                <h2>Fraud Probability Distribution</h2>
                <p>
                  Number of returned review-queue records in each
                  predicted probability range.
                </p>
              </div>

              <label className="filter-control">
                Probability filter
                <select
                  value={selectedRange}
                  onChange={(event) => setSelectedRange(event.target.value)}
                >
                  <option value="all">All ranges</option>
                  <option value="medium">40–60% range</option>
                  <option value="high">60–100% ranges</option>
                </select>
              </label>
            </div>

            <div className="chart-container">
              {loading ? (
                <p>Loading probability data...</p>
              ) : hasProbabilities ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={probabilityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="count"
                      name="Transactions"
                      fill="#2563eb"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p>
                  No valid fraud probabilities were returned by the
                  review-queue API.
                </p>
              )}
            </div>
          </section>

          <section className="dashboard-grid">
            <div className="dashboard-card">
              <h2>Decision Distribution</h2>
              <p>
                Approve, review, and block decisions among returned
                review-queue records.
              </p>

              <div className="chart-container">
                {loading ? (
                  <p>Loading decision data...</p>
                ) : hasDecisions ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={decisionData.filter((item) => item.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={90}
                        label
                      >
                        {decisionData
                          .filter((item) => item.value > 0)
                          .map((item) => (
                            <Cell
                              key={item.name}
                              fill={
                                COLORS[
                                  ["Approve", "Review", "Block"].indexOf(
                                    item.name
                                  )
                                ]
                              }
                            />
                          ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p>No recognized decisions are available to chart.</p>
                )}
              </div>

              <p>
                Approve: {formatNumber(decisionData[0]?.value)} · Review:{" "}
                {formatNumber(decisionData[1]?.value)} · Block:{" "}
                {formatNumber(decisionData[2]?.value)}
              </p>
            </div>

            <div className="dashboard-card">
              <h2>Expected Cost Overview</h2>
              <p>
                Total and average expected costs returned by the backend.
              </p>

              <div className="chart-container">
                {loading ? (
                  <p>Loading cost data...</p>
                ) : costEntries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costEntries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Bar
                        dataKey="cost"
                        name="Expected cost (INR)"
                        fill="#7c3aed"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p>
                    Expected cost data is unavailable. Check
                    GET /dashboard/cost.
                  </p>
                )}
              </div>

              {cost && (
                <p>
                  Prediction count: {formatNumber(cost.prediction_count)}
                  <br />
                  Average expected cost:{" "}
                  {formatCurrency(cost.average_expected_cost)}
                </p>
              )}
            </div>
          </section>

          <section className="dashboard-card">
            <h2>Cost-Sensitive Decision Overview</h2>
            <p>
              Cost-sensitive fraud detection considers the consequences
              of false positives and false negatives when selecting
              decisions. Detailed fraud rates and confirmed fraud counts
              are not displayed because the current summary endpoint does
              not provide those fields.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default RiskAnalytics;
