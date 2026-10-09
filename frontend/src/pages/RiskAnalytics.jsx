
import { useState } from "react";
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

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";

const probabilityData = [
  { range: "0–20%", count: 4200 },
  { range: "21–40%", count: 2600 },
  { range: "41–60%", count: 1500 },
  { range: "61–80%", count: 1000 },
  { range: "81–100%", count: 700 },
];

const costData = [
  { category: "Approve", cost: 12000 },
  { category: "Review", cost: 6500 },
  { category: "Block", cost: 6000 },
];

const decisionData = [
  { name: "Approve", value: 7200 },
  { name: "Review", value: 1800 },
  { name: "Block", value: 1000 },
];

const COLORS = ["#16a34a", "#f59e0b", "#dc2626"];

function RiskAnalytics() {
  const [selectedRange, setSelectedRange] = useState("all");

  const filteredProbabilityData =
    selectedRange === "high"
      ? probabilityData.filter((item) =>
          ["61–80%", "81–100%"].includes(item.range)
        )
      : selectedRange === "medium"
        ? probabilityData.filter((item) =>
            ["41–60%"].includes(item.range)
          )
        : probabilityData;

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
                Explore fraud probability, decisions, and
                estimated decision costs.
              </p>
            </div>

            <span className="data-status">DEMO DATA ONLY</span>
          </div>

          <div className="dashboard-info">
            <p>
              Backend connection is pending. All figures on
              this page are illustrative sample data, not
              actual model predictions or measured results.
            </p>
          </div>

          <section className="stats-grid">
            <StatCard
              title="Fraud Rate"
              value="4.2%"
              subtitle="Illustrative demo rate"
            />

            <StatCard
              title="Fraud Cases"
              value="420"
              subtitle="Sample count only"
            />

            <StatCard
              title="Review Cases"
              value="1,800"
              subtitle="Sample count only"
            />

            <StatCard
              title="Expected Cost"
              value="₹24,500"
              subtitle="Illustrative demo value"
            />
          </section>

          <section className="dashboard-card">
            <div className="analytics-heading">
              <div>
                <h2>Fraud Probability Distribution</h2>
                <p>
                  Sample transactions grouped by predicted
                  fraud probability.
                </p>
              </div>

              <label className="filter-control">
                Probability filter
                <select
                  value={selectedRange}
                  onChange={(event) =>
                    setSelectedRange(event.target.value)
                  }
                >
                  <option value="all">All ranges</option>
                  <option value="medium">Medium range</option>
                  <option value="high">High ranges</option>
                </select>
              </label>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredProbabilityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="Sample transactions"
                    fill="#2563eb"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="dashboard-grid">
            <div className="dashboard-card">
              <h2>Decision Distribution</h2>
              <p>
                Illustrative distribution of transaction
                decisions.
              </p>

              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={decisionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={90}
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
            </div>

            <div className="dashboard-card">
              <h2>Estimated Cost by Decision</h2>
              <p>
                Illustrative cost values for comparing
                decision categories.
              </p>

              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) =>
                        `₹${Number(value).toLocaleString("en-IN")}`
                      }
                    />
                    <Bar
                      dataKey="cost"
                      name="Sample cost (INR)"
                      fill="#7c3aed"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="dashboard-card">
            <h2>Cost-Sensitive Decision Overview</h2>

            <p>
              A cost-sensitive fraud detection system considers
              the different consequences of false positives
              and false negatives when selecting decisions.
              The final policy and cost calculations will
              depend on the model and cost configuration
              provided by the backend.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default RiskAnalytics;
