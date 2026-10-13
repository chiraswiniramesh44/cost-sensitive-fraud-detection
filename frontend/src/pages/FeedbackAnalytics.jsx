
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import api from "../services/api";

const FEEDBACK_TYPES = [
  { name: "Confirmed Fraud", value: "CONFIRMED_FRAUD", color: "#dc2626" },
  { name: "Confirmed Genuine", value: "CONFIRMED_GENUINE", color: "#16a34a" },
  { name: "Disputed", value: "DISPUTED", color: "#f59e0b" },
  { name: "Inconclusive", value: "INCONCLUSIVE", color: "#64748b" },
];

function normalizeFeedback(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.feedback)) return response.feedback;
  return null;
}

function getFeedbackValue(record) {
  return String(
    record?.feedback ??
    record?.feedback_label ??
    record?.label ??
    record?.operator_decision ??
    record?.decision ??
    ""
  ).trim().toUpperCase();
}

function FeedbackAnalytics() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFeedback() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/feedback");
        const list = normalizeFeedback(response.data);

        if (!list) {
          throw new Error(
            "The feedback API response does not contain a recognized list."
          );
        }

        if (!cancelled) {
          setRecords(list);
        }
      } catch (err) {
        if (!cancelled) {
          setRecords([]);
          const status = err?.response?.status;

          if (status === 401) {
            setError(
              "Your session has expired. Log in again and reopen Feedback Analytics."
            );
          } else if (status === 403) {
            setError(
              "Your account does not have permission to read feedback records. Ask the backend developer to check GET /feedback permissions."
            );
          } else {
            setError(
              err?.response?.data?.detail
                ? typeof err.response.data.detail === "string"
                  ? err.response.data.detail
                  : JSON.stringify(err.response.data.detail)
                : err.message || "Unable to load feedback records."
            );
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFeedback();

    return () => {
      cancelled = true;
    };
  }, []);

  const feedbackData = FEEDBACK_TYPES.map((type) => ({
    name: type.name,
    count: records.filter(
      (record) => getFeedbackValue(record) === type.value
    ).length,
    color: type.color,
  }));

  const totalFeedback = records.length;

  const confirmedFraud =
    feedbackData.find((item) => item.name === "Confirmed Fraud")?.count ?? 0;

  const confirmedGenuine =
    feedbackData.find((item) => item.name === "Confirmed Genuine")?.count ?? 0;

  const disputed =
    feedbackData.find((item) => item.name === "Disputed")?.count ?? 0;

  const inconclusive =
    feedbackData.find((item) => item.name === "Inconclusive")?.count ?? 0;

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-area">
        <Navbar />

        <main className="page-content">
          <div className="page-header">
            <div>
              <h1>Feedback Analytics</h1>
              <p>
                Explore operator feedback categories and their distribution.
              </p>
            </div>

            <span className="data-status">
              {loading ? "LOADING" : error ? "API ERROR" : "LIVE API DATA"}
            </span>
          </div>

          <div className="dashboard-info">
            {loading && <p>Loading feedback records from the backend...</p>}

            {!loading && error && (
              <p role="alert">
                {error}
              </p>
            )}

            {!loading && !error && (
              <p>
                Showing {totalFeedback} feedback records returned by the
                backend. Counts are calculated from the available feedback
                labels.
              </p>
            )}
          </div>

          <section className="stats-grid">
            <StatCard
              title="Total Feedback"
              value={loading ? "—" : totalFeedback}
              subtitle="Backend records"
            />

            <StatCard
              title="Confirmed Fraud"
              value={loading ? "—" : confirmedFraud}
              subtitle="Confirmed fraud labels"
            />

            <StatCard
              title="Confirmed Genuine"
              value={loading ? "—" : confirmedGenuine}
              subtitle="Confirmed genuine labels"
            />

            <StatCard
              title="Disputed"
              value={loading ? "—" : disputed}
              subtitle="Disputed labels"
            />

            <StatCard
              title="Inconclusive"
              value={loading ? "—" : inconclusive}
              subtitle="Inconclusive labels"
            />
          </section>

          <section className="dashboard-grid">
            <div className="dashboard-card">
              <h2>Feedback Distribution</h2>
              <p>Distribution of recorded operator feedback.</p>

              <div className="chart-container">
                {!loading && !error && totalFeedback > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={feedbackData.filter((item) => item.count > 0)}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={95}
                        label
                      >
                        {feedbackData
                          .filter((item) => item.count > 0)
                          .map((item) => (
                            <Cell key={item.name} fill={item.color} />
                          ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p>
                    {loading
                      ? "Loading chart..."
                      : error
                        ? "Feedback chart unavailable."
                        : "No feedback records available."}
                  </p>
                )}
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Feedback Category Counts</h2>
              <p>Number of records in each feedback category.</p>

              <div className="chart-container">
                {!loading && !error && totalFeedback > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={feedbackData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-15}
                        textAnchor="end"
                        height={75}
                        interval={0}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        name="Feedback records"
                        fill="#2563eb"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p>
                    {loading
                      ? "Loading chart..."
                      : error
                        ? "Feedback chart unavailable."
                        : "No feedback records available."}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="dashboard-card">
            <h2>Operator Feedback Loop</h2>

            <p>
              Operator feedback records help the team review model decisions,
              identify disagreements, and evaluate prediction quality.
              Feedback may support future model improvement through a
              separately validated and approved workflow.
            </p>

            <p>
              {loading
                ? "Checking backend feedback records."
                : error
                  ? "Backend feedback could not be loaded."
                  : `Currently displaying ${totalFeedback} records returned by the feedback API.`}
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default FeedbackAnalytics;
