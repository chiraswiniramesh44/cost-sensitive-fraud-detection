
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import RiskBadge from "../components/RiskBadge";
import DecisionBadge from "../components/DecisionBadge";

const demoTransactions = [
  {
    id: "DEMO-1001",
    amount: 18500,
    probability: 0.942,
    risk: "HIGH",
    decision: "BLOCK",
    reason: "Unusual transaction amount",
    date: "2026-10-09 09:15",
  },
  {
    id: "DEMO-1002",
    amount: 7200,
    probability: 0.685,
    risk: "MEDIUM",
    decision: "REVIEW",
    reason: "Unusual transaction pattern",
    date: "2026-10-09 09:20",
  },
  {
    id: "DEMO-1003",
    amount: 950,
    probability: 0.081,
    risk: "LOW",
    decision: "APPROVE",
    reason: "Low estimated risk",
    date: "2026-10-09 09:25",
  },
  {
    id: "DEMO-1004",
    amount: 26500,
    probability: 0.887,
    risk: "HIGH",
    decision: "BLOCK",
    reason: "High estimated fraud probability",
    date: "2026-10-09 09:30",
  },
  {
    id: "DEMO-1005",
    amount: 4300,
    probability: 0.514,
    risk: "MEDIUM",
    decision: "REVIEW",
    reason: "Requires operator assessment",
    date: "2026-10-09 09:35",
  },
  {
    id: "DEMO-1006",
    amount: 1200,
    probability: 0.12,
    risk: "LOW",
    decision: "APPROVE",
    reason: "Low estimated risk",
    date: "2026-10-09 09:40",
  },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function ReviewQueue() {
  const navigate = useNavigate();
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("high");

  const filteredTransactions = useMemo(() => {
    const filtered = demoTransactions.filter((transaction) => {
      const matchesRisk =
        riskFilter === "ALL" || transaction.risk === riskFilter;

      const matchesSearch =
        transaction.id.toLowerCase().includes(search.toLowerCase());

      return matchesRisk && matchesSearch;
    });

    return filtered.sort((a, b) =>
      sortOrder === "high"
        ? b.probability - a.probability
        : a.probability - b.probability
    );
  }, [riskFilter, search, sortOrder]);

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-area">
        <Navbar />

        <main className="page-content">
          <div className="page-header">
            <div>
              <h1>Review Queue</h1>
              <p>
                Examine sample transactions and open their
                details for operator assessment.
              </p>
            </div>

            <span className="data-status">DEMO DATA ONLY</span>
          </div>

          <div className="dashboard-info">
            <p>
              The backend is pending. These illustrative
              transactions are local demo records, not actual
              fraud alerts.
            </p>
          </div>

          <section className="dashboard-card">
            <div className="review-toolbar">
              <label>
                Search transaction
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Example: DEMO-1001"
                />
              </label>

              <label>
                Risk level
                <select
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value)}
                >
                  <option value="ALL">All levels</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </label>

              <label>
                Sort by probability
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                >
                  <option value="high">Highest first</option>
                  <option value="low">Lowest first</option>
                </select>
              </label>
            </div>

            <p className="review-count">
              Showing {filteredTransactions.length} of{" "}
              {demoTransactions.length} sample transactions
            </p>

            <div className="transaction-table-container">
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Amount</th>
                    <th>Fraud Probability</th>
                    <th>Risk</th>
                    <th>Decision</th>
                    <th>Reason</th>
                    <th>Details</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.id}</td>
                      <td>{formatCurrency(transaction.amount)}</td>
                      <td>
                        {(transaction.probability * 100).toFixed(1)}%
                      </td>
                      <td>
                        <RiskBadge level={transaction.risk} />
                      </td>
                      <td>
                        <DecisionBadge decision={transaction.decision} />
                      </td>
                      <td>{transaction.reason}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/case/${transaction.id}`)
                          }
                        >
                          View case
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan="7">
                        No sample transactions match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default ReviewQueue;
