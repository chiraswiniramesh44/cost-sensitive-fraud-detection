import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import TransactionTable from "../components/TransactionTable";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import transactionService from "../services/transactionService";

function ReviewQueue() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReviewQueue = async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await transactionService.getReviewQueue();

        const data =
          response?.data ||
          response?.transactions ||
          response ||
          [];

        const transactionList = Array.isArray(data)
          ? data
          : [];

        setTransactions(transactionList);
        setFilteredTransactions(transactionList);
      } catch (err) {
        console.error(
          "Review queue loading error:",
          err
        );

        setError(
          err.response?.data?.detail ||
            "Unable to load review queue."
        );
      } finally {
        setLoading(false);
      }
    };

    loadReviewQueue();
  }, []);

  useEffect(() => {
    if (filter === "ALL") {
      setFilteredTransactions(transactions);
      return;
    }

    const filtered = transactions.filter(
      (transaction) =>
        transaction.risk_level?.toUpperCase() ===
        filter
    );

    setFilteredTransactions(filtered);
  }, [filter, transactions]);

  const handleSelect = (transaction) => {
    if (transaction.id) {
      navigate(`/case/${transaction.id}`);
    }
  };

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
                Review transactions flagged for operator
                assessment.
              </p>
            </div>

            <div>
              <label htmlFor="risk-filter">
                Risk Level
              </label>

              <select
                id="risk-filter"
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
                }
              >
                <option value="ALL">All</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {loading && (
            <LoadingSpinner message="Loading review queue..." />
          )}

          {!loading && error && (
            <ErrorMessage message={error} />
          )}

          {!loading &&
            !error &&
            filteredTransactions.length === 0 && (
              <EmptyState message="No transactions require review." />
            )}

          {!loading &&
            !error &&
            filteredTransactions.length > 0 && (
              <div className="dashboard-card">
                <TransactionTable
                  transactions={filteredTransactions}
                  onSelect={handleSelect}
                />
              </div>
            )}
        </main>
      </div>
    </div>
  );
}

export default ReviewQueue;