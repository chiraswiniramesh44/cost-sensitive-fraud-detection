import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import dashboardService from "../services/dashboardService";
import { FEEDBACK_DECISIONS } from "../utils/constants";

function FeedbackAnalytics() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadFeedbackAnalytics = async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await dashboardService.getSummary();

        setSummary(response);
      } catch (err) {
        console.error(
          "Feedback analytics loading error:",
          err
        );

        setError(
          err.response?.data?.detail ||
            "Unable to load feedback analytics."
        );
      } finally {
        setLoading(false);
      }
    };

    loadFeedbackAnalytics();
  }, []);

  const feedback = summary?.feedback || {};

  const totalFeedback =
    feedback.total ??
    Object.values(feedback).reduce(
      (total, value) =>
        typeof value === "number"
          ? total + value
          : total,
      0
    );

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />

        <div className="main-area">
          <Navbar />

          <main className="page-content">
            <LoadingSpinner message="Loading feedback analytics..." />
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
              <h1>Feedback Analytics</h1>

              <p>
                Analyze operator feedback collected from
                reviewed fraud cases.
              </p>
            </div>
          </div>

          {error && (
            <ErrorMessage message={error} />
          )}

          {!summary && !error ? (
            <EmptyState
              message="No feedback analytics data available."
            />
          ) : (
            <>
              <section className="stats-grid">
                <StatCard
                  title="Total Feedback"
                  value={totalFeedback}
                  subtitle="Operator feedback records"
                />

                <StatCard
                  title="Confirmed Fraud"
                  value={
                    feedback[
                      FEEDBACK_DECISIONS.CONFIRMED_FRAUD
                    ] ?? 0
                  }
                  subtitle="Cases confirmed as fraud"
                />

                <StatCard
                  title="Confirmed Genuine"
                  value={
                    feedback[
                      FEEDBACK_DECISIONS.CONFIRMED_GENUINE
                    ] ?? 0
                  }
                  subtitle="Cases confirmed genuine"
                />

                <StatCard
                  title="Disputed"
                  value={
                    feedback[
                      FEEDBACK_DECISIONS.DISPUTED
                    ] ?? 0
                  }
                  subtitle="Cases requiring further review"
                />

                <StatCard
                  title="Inconclusive"
                  value={
                    feedback[
                      FEEDBACK_DECISIONS.INCONCLUSIVE
                    ] ?? 0
                  }
                  subtitle="Cases without a final conclusion"
                />
              </section>

              <section className="dashboard-grid">
                <div className="dashboard-card">
                  <h3>Operator Feedback Loop</h3>

                  <p>
                    Operator feedback provides ground-truth
                    information that can be used to evaluate
                    model predictions and support future model
                    improvement.
                  </p>
                </div>

                <div className="dashboard-card">
                  <h3>Feedback Distribution</h3>

                  {totalFeedback > 0 ? (
                    <div className="feedback-distribution">
                      <p>
                        Confirmed Fraud:{" "}
                        {feedback[
                          FEEDBACK_DECISIONS.CONFIRMED_FRAUD
                        ] ?? 0}
                      </p>

                      <p>
                        Confirmed Genuine:{" "}
                        {feedback[
                          FEEDBACK_DECISIONS.CONFIRMED_GENUINE
                        ] ?? 0}
                      </p>

                      <p>
                        Disputed:{" "}
                        {feedback[
                          FEEDBACK_DECISIONS.DISPUTED
                        ] ?? 0}
                      </p>

                      <p>
                        Inconclusive:{" "}
                        {feedback[
                          FEEDBACK_DECISIONS.INCONCLUSIVE
                        ] ?? 0}
                      </p>
                    </div>
                  ) : (
                    <EmptyState
                      message="No operator feedback has been recorded."
                    />
                  )}
                </div>
              </section>

              <div className="dashboard-card">
                <h3>Research Perspective</h3>

                <p>
                  The feedback loop allows operator decisions
                  to be compared with model predictions. This
                  information can later support evaluation of
                  model performance, threshold decisions, and
                  cost-sensitive retraining.
                </p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default FeedbackAnalytics;