
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import RiskBadge from "../components/RiskBadge";
import DecisionBadge from "../components/DecisionBadge";

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function normalizeRisk(value, probability) {
  if (value) {
    const risk = String(value).toUpperCase();

    if (["HIGH", "MEDIUM", "LOW"].includes(risk)) {
      return risk;
    }
  }

  if (probability === null || probability === undefined) {
    return "UNKNOWN";
  }

  const p = Number(probability);

  if (!Number.isFinite(p)) return "UNKNOWN";

  const normalized = p > 1 ? p / 100 : p;

  if (normalized >= 0.7) return "HIGH";
  if (normalized >= 0.3) return "MEDIUM";
  return "LOW";
}

function normalizeTransaction(item, index) {
  const probabilityValue =
    item.fraud_probability ??
    item.fraud_probability_score ??
    item.probability ??
    item.prediction_probability ??
    item.risk_score ??
    null;

  let probability =
    probabilityValue === null ? null : Number(probabilityValue);

  if (probability !== null && Number.isFinite(probability)) {
    if (probability > 1 && probability <= 100) {
      probability /= 100;
    }
  } else {
    probability = null;
  }

  const rawDecision =
    item.decision ??
    item.recommended_decision ??
    item.final_decision ??
    item.action ??
    "";

  const decisionText = String(rawDecision).toUpperCase();

  const decision = ["APPROVE", "REVIEW", "BLOCK"].includes(decisionText)
    ? decisionText
    : decisionText === "APPROVED"
      ? "APPROVE"
      : decisionText === "BLOCKED"
        ? "BLOCK"
        : decisionText === "REVIEW_REQUIRED"
          ? "REVIEW"
          : "UNKNOWN";

  return {
    id: String(
      item.transaction_id ??
        item.id ??
        item.prediction_id ??
        item.transaction_ref ??
        `record-${index + 1}`
    ),
    amount: item.amount ?? item.transaction_amount ?? null,
    probability,
    risk: normalizeRisk(
      item.risk_level ?? item.risk_category ?? item.risk,
      probability
    ),
    decision,
    reason:
      item.reason ??
      item.explanation ??
      item.decision_reason ??
      item.risk_reason ??
      "No explanation provided by the API",
    date:
      item.created_at ??
      item.timestamp ??
      item.transaction_date ??
      item.predicted_at ??
      null,
  };
}

function getTransactionList(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.items)) {
    return responseData.items;
  }

  if (Array.isArray(responseData?.transactions)) {
    return responseData.transactions;
  }

  if (Array.isArray(responseData?.results)) {
    return responseData.results;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  return [];
}

function ReviewQueue() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("high");

  useEffect(() => {
    let active = true;

    async function loadReviewQueue() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/review-queue", {
          params: {
            limit: 50,
            offset: 0,
          },
        });

        if (!active) return;

        const records = getTransactionList(response.data);
        setTransactions(records.map(normalizeTransaction));
      } catch (err) {
        if (!active) return;

        setTransactions([]);

        if (err.response?.status === 401) {
          setError(
            "Your session is not authorized. Please log in again."
          );
        } else {
          setError(
            err.response?.data?.detail ||
              "Unable to load the review queue from the backend."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReviewQueue();

    return () => {
      active = false;
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = transactions.filter((transaction) => {
      const matchesRisk =
        riskFilter === "ALL" || transaction.risk === riskFilter;

      const matchesSearch =
        transaction.id.toLowerCase().includes(query);

      return matchesRisk && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      const aProbability = a.probability ?? -1;
      const bProbability = b.probability ?? -1;

      return sortOrder === "high"
        ? bProbability - aProbability
        : aProbability - bProbability;
    });
  }, [transactions, riskFilter, search, sortOrder]);

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
                Examine transactions returned by the backend
                and open individual cases for assessment.
              </p>
            </div>

            <span className="data-status">
              {loading
                ? "LOADING DATA"
                : error
                  ? "API ERROR"
                  : "LIVE API DATA"}
            </span>
          </div>

          {loading && (
            <div className="dashboard-info">
              <p>Loading transactions from the backend...</p>
            </div>
          )}

          {!loading && error && (
            <div className="dashboard-info" role="alert">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="dashboard-info">
              <p>
                Displaying transactions returned by the
                authenticated review-queue API. The endpoint
                currently requests up to 50 records.
              </p>
            </div>
          )}

          <section className="dashboard-card">
            <div className="review-toolbar">
              <label>
                Search transaction
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Enter transaction ID"
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
                  <option value="UNKNOWN">Unknown</option>
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
              {transactions.length} API records
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
                        {transaction.probability === null
                          ? "—"
                          : `${(transaction.probability * 100).toFixed(1)}%`}
                      </td>
                      <td>
                        {transaction.risk === "UNKNOWN" ? (
                          "Unknown"
                        ) : (
                          <RiskBadge level={transaction.risk} />
                        )}
                      </td>
                      <td>
                        {transaction.decision === "UNKNOWN" ? (
                          "Unknown"
                        ) : (
                          <DecisionBadge decision={transaction.decision} />
                        )}
                      </td>
                      <td>{transaction.reason}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/case/${encodeURIComponent(transaction.id)}`
                            )
                          }
                        >
                          View case
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!loading &&
                    !error &&
                    filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          No API records match your filters.
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
