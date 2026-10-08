import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import RiskBadge from "../components/RiskBadge";
import DecisionBadge from "../components/DecisionBadge";
import ShapExplanation from "../components/ShapExplanation";
import FeedbackForm from "../components/FeedbackForm";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import transactionService from "../services/transactionService";
import {
  formatCurrency,
  formatPercentage,
  formatDateTime,
} from "../utils/formatters";

function CaseDetail() {
  const { id } = useParams();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTransaction = async () => {
    setLoading(true);
    setError("");

    try {
      const data =
        await transactionService.getTransaction(id);

      setTransaction(data);
    } catch (err) {
      console.error("Transaction loading error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to load transaction details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransaction();
  }, [id]);

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />

        <div className="main-area">
          <Navbar />

          <main className="page-content">
            <LoadingSpinner message="Loading case details..." />
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-layout">
        <Sidebar />

        <div className="main-area">
          <Navbar />

          <main className="page-content">
            <ErrorMessage message={error} />
          </main>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="app-layout">
        <Sidebar />

        <div className="main-area">
          <Navbar />

          <main className="page-content">
            <EmptyState message="Transaction not found." />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-area">
        <Navbar />

        <main className="page-content">
          <div className="page-header">
            <div>
              <h1>Case Detail</h1>

              <p>
                Transaction ID:{" "}
                {transaction.id || id}
              </p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-title">
                Fraud Probability
              </div>

              <div className="stat-card-value">
                {formatPercentage(
                  transaction.fraud_probability
                )}
              </div>

              <div className="stat-card-subtitle">
                Model prediction
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-title">
                Expected Cost
              </div>

              <div className="stat-card-value">
                {formatCurrency(
                  transaction.expected_cost
                )}
              </div>

              <div className="stat-card-subtitle">
                Estimated decision cost
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-title">
                Model Version
              </div>

              <div className="stat-card-value">
                {transaction.model_version || "—"}
              </div>

              <div className="stat-card-subtitle">
                Prediction model
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <h3>Transaction Information</h3>

              <div className="transaction-details">
                <p>
                  <strong>Transaction ID:</strong>{" "}
                  {transaction.id || id}
                </p>

                <p>
                  <strong>Amount:</strong>{" "}
                  {formatCurrency(
                    transaction.amount
                  )}
                </p>

                <p>
                  <strong>Timestamp:</strong>{" "}
                  {formatDateTime(
                    transaction.timestamp
                  )}
                </p>

                <p>
                  <strong>Risk Level:</strong>{" "}
                  <RiskBadge
                    level={transaction.risk_level}
                  />
                </p>

                <p>
                  <strong>Decision:</strong>{" "}
                  <DecisionBadge
                    decision={transaction.decision}
                  />
                </p>

                <p>
                  <strong>Threshold:</strong>{" "}
                  {formatPercentage(
                    transaction.threshold
                  )}
                </p>
              </div>
            </div>

            <div className="dashboard-card">
              <ShapExplanation
                explanation={
                  transaction.explanation || []
                }
              />
            </div>
          </div>

          <div className="dashboard-card">
            <FeedbackForm
              transactionId={
                transaction.id || id
              }
              onSubmitted={loadTransaction}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default CaseDetail;