
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

const demoStats = [
  {
    title: "Total Transactions",
    value: "10,000",
    subtitle: "Sample dataset",
  },
  {
    title: "Fraud Alerts",
    value: "420",
    subtitle: "Illustrative demo count",
  },
  {
    title: "Review Queue",
    value: "86",
    subtitle: "Illustrative pending cases",
  },
  {
    title: "Fraud Rate",
    value: "4.2%",
    subtitle: "Illustrative demo rate",
  },
  {
    title: "Expected Cost",
    value: "₹24,500",
    subtitle: "Illustrative demo value",
  },
  {
    title: "Model Version",
    value: "DEMO-1.0",
    subtitle: "Not a deployed model",
  },
];

const decisionData = [
  { name: "Approve", value: 7200 },
  { name: "Review", value: 1800 },
  { name: "Block", value: 1000 },
];

const chartColors = ["#16a34a", "#f59e0b", "#dc2626"];

const recentCases = [
  {
    id: "DEMO-1001",
    amount: "₹18,500",
    probability: "94.2%",
    risk: "HIGH",
    decision: "BLOCK",
  },
  {
    id: "DEMO-1002",
    amount: "₹7,200",
    probability: "68.5%",
    risk: "MEDIUM",
    decision: "REVIEW",
  },
  {
    id: "DEMO-1003",
    amount: "₹950",
    probability: "8.1%",
    risk: "LOW",
    decision: "APPROVE",
  },
];

function Dashboard() {
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
                Monitor transactions, risk decisions, and
                operator review activity.
              </p>
            </div>

            <span className="data-status">
              DEMO DATA ONLY
            </span>
          </div>

          <div className="dashboard-info">
            <p>
              Backend connection is pending. The figures
              displayed below are illustrative sample data,
              not actual model results.
            </p>
          </div>

          <section className="stats-grid">
            {demoStats.map((stat) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
              />
            ))}
          </section>

          <section className="dashboard-grid">
            <div className="dashboard-card">
              <h3>Decision Distribution</h3>

              <p>
                Illustrative distribution across 10,000
                sample transactions.
              </p>

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
            </div>

            <div className="dashboard-card">
              <h3>Decision Policy</h3>

              <div className="dashboard-info">
                <p>
                  <strong>APPROVE</strong> — allow the
                  transaction according to the decision policy.
                </p>

                <p>
                  <strong>REVIEW</strong> — send the case
                  for operator assessment.
                </p>

                <p>
                  <strong>BLOCK</strong> — block the
                  transaction according to the decision policy.
                </p>
              </div>

              <p>
                Actual decisions will come from the backend's
                cost-sensitive decision engine.
              </p>
            </div>
          </section>

          <section className="dashboard-card">
            <h3>Recent High-Risk Cases</h3>

            <p style={{ marginBottom: 16 }}>
              Illustrative sample transactions for UI testing.
            </p>

            <div className="transaction-table-container">
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Amount</th>
                    <th>Fraud Probability</th>
                    <th>Risk Level</th>
                    <th>Decision</th>
                  </tr>
                </thead>

                <tbody>
                  {recentCases.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.amount}</td>
                      <td>{item.probability}</td>
                      <td>
                        <span
                          className={`risk-badge risk-${item.risk.toLowerCase()}`}
                        >
                          {item.risk}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`decision-badge decision-${item.decision.toLowerCase()}`}
                        >
                          {item.decision}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
