
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import RiskBadge from "../components/RiskBadge";
import DecisionBadge from "../components/DecisionBadge";
import FeedbackForm from "../components/FeedbackForm";
import ShapExplanation from "../components/ShapExplanation";

const demoCases = {
  "DEMO-1001": {
    id: "DEMO-1001",
    amount: 18500,
    probability: 0.942,
    risk: "HIGH",
    decision: "BLOCK",
    threshold: 0.75,
    expectedCost: 1200,
    modelVersion: "DEMO-1.0",
    reason: "Unusual transaction amount",
    features: [
      { name: "Transaction amount", value: 0.82 },
      { name: "Transaction frequency", value: 0.61 },
      { name: "Time of transaction", value: 0.34 },
    ],
  },
  "DEMO-1002": {
    id: "DEMO-1002",
    amount: 7200,
    probability: 0.685,
    risk: "MEDIUM",
    decision: "REVIEW",
    threshold: 0.75,
    expectedCost: 650,
    modelVersion: "DEMO-1.0",
    reason: "Unusual transaction pattern",
    features: [
      { name: "Transaction amount", value: 0.51 },
      { name: "Transaction frequency", value: 0.72 },
      { name: "Time of transaction", value: 0.29 },
    ],
  },
  "DEMO-1003": {
    id: "DEMO-1003",
    amount: 950,
    probability: 0.081,
    risk: "LOW",
    decision: "APPROVE",
    threshold: 0.75,
    expectedCost: 25,
    modelVersion: "DEMO-1.0",
    reason: "Low estimated risk",
    features: [
      { name: "Transaction amount", value: 0.08 },
      { name: "Transaction frequency", value: 0.12 },
      { name: "Time of transaction", value: 0.10 },
    ],
  },
  "DEMO-1004": {
    id: "DEMO-1004",
    amount: 26500,
    probability: 0.887,
    risk: "HIGH",
    decision: "BLOCK",
    threshold: 0.75,
    expectedCost: 1800,
    modelVersion: "DEMO-1.0",
    reason: "High estimated fraud probability",
    features: [
      { name: "Transaction amount", value: 0.91 },
      { name: "Transaction frequency", value: 0.67 },
      { name: "Time of transaction", value: 0.42 },
    ],
  },
  "DEMO-1005": {
    id: "DEMO-1005",
    amount: 4300,
    probability: 0.514,
    risk: "MEDIUM",
    decision: "REVIEW",
    threshold: 0.75,
    expectedCost: 420,
    modelVersion: "DEMO-1.0",
    reason: "Requires operator assessment",
    features: [
      { name: "Transaction amount", value: 0.34 },
      { name: "Transaction frequency", value: 0.58 },
      { name: "Time of transaction", value: 0.47 },
    ],
  },
  "DEMO-1006": {
    id: "DEMO-1006",
    amount: 1200,
    probability: 0.12,
    risk: "LOW",
    decision: "APPROVE",
    threshold: 0.75,
    expectedCost: 35,
    modelVersion: "DEMO-1.0",
    reason: "Low estimated risk",
    features: [
      { name: "Transaction amount", value: 0.11 },
      { name: "Transaction frequency", value: 0.14 },
      { name: "Time of transaction", value: 0.09 },
    ],
  },
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const transaction = demoCases[id];

  const [feedbackMessage, setFeedbackMessage] = useState("");

  if (!transaction) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">
          <Navbar />
          <main className="page-content">
            <h1>Case not found</h1>
            <p>
              This case is not present in the local demo dataset.
            </p>
            <button
              type="button"
              onClick={() => navigate("/review-queue")}
            >
              Back to Review Queue
            </button>
          </main>
        </div>
      </div>
    );
  }

  const handleFeedback = (result) => {
    setFeedbackMessage(
      `Demo feedback recorded locally: ${result}`
    );
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-area">
        <Navbar />

        <main className="page-content">
          <div className="page-header">
            <div>
              <h1>Case Details</h1>
              <p>
                Transaction ID: <strong>{transaction.id}</strong>
              </p>
            </div>

            <span className="data-status">DEMO DATA ONLY</span>
          </div>

          <div className="dashboard-info">
            <p>
              This case uses synthetic sample data. Its risk
              score, expected cost, and feature values are
              illustrative and are not model predictions.
            </p>
          </div>

          <section className="stats-grid">
            <div className="dashboard-card">
              <h3>Transaction Amount</h3>
              <h2>{formatCurrency(transaction.amount)}</h2>
            </div>

            <div className="dashboard-card">
              <h3>Fraud Probability</h3>
              <h2>
                {(transaction.probability * 100).toFixed(1)}%
              </h2>
            </div>

            <div className="dashboard-card">
              <h3>Risk Level</h3>
              <RiskBadge level={transaction.risk} />
            </div>

            <div className="dashboard-card">
              <h3>System Decision</h3>
              <DecisionBadge decision={transaction.decision} />
            </div>
          </section>

          <section className="dashboard-grid">
            <div className="dashboard-card">
              <h2>Decision Information</h2>

              <p>
                <strong>Threshold:</strong>{" "}
                {(transaction.threshold * 100).toFixed(0)}%
              </p>

              <p>
                <strong>Illustrative expected cost:</strong>{" "}
                {formatCurrency(transaction.expectedCost)}
              </p>

              <p>
                <strong>Model version:</strong>{" "}
                {transaction.modelVersion}
              </p>

              <p>
                <strong>Sample reason:</strong>{" "}
                {transaction.reason}
              </p>
            </div>

            <div className="dashboard-card">
              <h2>Feature Explanation</h2>
              <p>
                Illustrative feature values for UI testing.
                These are not actual SHAP values.
              </p>

              <ShapExplanation
                explanation={transaction.features}
              />
            </div>
          </section>

          <section className="dashboard-card">
            <h2>Operator Feedback</h2>

            <p>
              Select a feedback label to demonstrate the
              operator feedback workflow.
            </p>

            <FeedbackForm onSubmit={handleFeedback} />

            {feedbackMessage && (
              <div className="dashboard-info">
                <p>{feedbackMessage}</p>
                <p>
                  This feedback is held only in the current
                  page state. It has not been saved to a
                  database or sent to the backend.
                </p>
              </div>
            )}
          </section>

          <button
            type="button"
            onClick={() => navigate("/review-queue")}
          >
            Back to Review Queue
          </button>
        </main>
      </div>
    </div>
  );
}

export default CaseDetail;
