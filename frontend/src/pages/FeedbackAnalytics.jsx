
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

const feedbackData = [
  { name: "Confirmed Fraud", count: 24 },
  { name: "Confirmed Genuine", count: 38 },
  { name: "Disputed", count: 8 },
  { name: "Inconclusive", count: 10 },
];

const COLORS = ["#dc2626", "#16a34a", "#f59e0b", "#64748b"];

function FeedbackAnalytics() {
  const totalFeedback = feedbackData.reduce(
    (total, item) => total + item.count,
    0
  );

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
                Explore operator feedback categories and
                their distribution.
              </p>
            </div>

            <span className="data-status">DEMO DATA ONLY</span>
          </div>

          <div className="dashboard-info">
            <p>
              Backend connection is pending. These illustrative
              counts are for interface testing only and are
              not actual operator feedback records.
            </p>
          </div>

          <section className="stats-grid">
            <StatCard
              title="Total Feedback"
              value={totalFeedback}
              subtitle="Illustrative records"
            />

            <StatCard
              title="Confirmed Fraud"
              value={confirmedFraud}
              subtitle="Sample count"
            />

            <StatCard
              title="Confirmed Genuine"
              value={confirmedGenuine}
              subtitle="Sample count"
            />

            <StatCard
              title="Disputed"
              value={disputed}
              subtitle="Sample count"
            />

            <StatCard
              title="Inconclusive"
              value={inconclusive}
              subtitle="Sample count"
            />
          </section>

          <section className="dashboard-grid">
            <div className="dashboard-card">
              <h2>Feedback Distribution</h2>
              <p>
                Illustrative operator feedback categories.
              </p>

              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={feedbackData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={95}
                      label
                    >
                      {feedbackData.map((item, index) => (
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
            </div>

            <div className="dashboard-card">
              <h2>Feedback Category Counts</h2>
              <p>
                Compare the sample number of records in each
                feedback category.
              </p>

              <div className="chart-container">
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
                      name="Sample records"
                      fill="#2563eb"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="dashboard-card">
            <h2>Operator Feedback Loop</h2>

            <p>
              Operator feedback can help evaluate prediction
              quality and identify cases where the model's
              decision differs from the operator's assessment.
              In the complete system, feedback will be stored
              by the backend and may support model evaluation
              and future retraining under an approved workflow.
            </p>

            <p>
              Current status: frontend demonstration only.
              Feedback persistence and backend integration
              have not been implemented here.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default FeedbackAnalytics;
