import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import ProbabilityChart from "../components/ProbabilityChart";
import CostChart from "../components/CostChart";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import dashboardService from "../services/dashboardService";
import {
  formatCurrency,
  formatPercentage,
} from "../utils/formatters";

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [costData, setCostData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const [summaryResponse, costResponse] =
          await Promise.all([
            dashboardService.getSummary(),
            dashboardService.getCostAnalytics(),
          ]);

        setSummary(summaryResponse);
        setCostData(costResponse?.data || costResponse || []);
      } catch (err) {
        console.error("Dashboard loading error:", err);

        setError(
          err.response?.data?.detail ||
            "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const probabilityData = summary?.probability_distribution || [];

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />

        <div className="main-area">
          <Navbar />

          <main className="page-content">
            <LoadingSpinner message="Loading dashboard..." />
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
              <h1>Fraud Detection Dashboard</h1>

              <p>
                Cost-Sensitive Fraud Detection with Operator
                Feedback Loop
              </p>
            </div>

            <span className="data-status">
              Live API Data
            </span>
          </div>

          {error && (
            <ErrorMessage message={error} />
          )}

          {!summary && !error ? (
            <EmptyState message="No dashboard data available." />
          ) : (
            <>
              <section className="stats-grid">
                <StatCard
                  title="Total Transactions"
                  value={
                    summary?.total_transactions ?? "—"
                  }
                  subtitle="Transactions analyzed"
                />

                <StatCard
                  title="Fraud Cases"
                  value={
                    summary?.fraud_cases ?? "—"
                  }
                  subtitle="Detected fraud cases"
                />

                <StatCard
                  title="Review Queue"
                  value={
                    summary?.review_cases ?? "—"
                  }
                  subtitle="Cases requiring review"
                />

                <StatCard
                  title="Fraud Rate"
                  value={
                    formatPercentage(
                      summary?.fraud_rate
                    )
                  }
                  subtitle="Detected fraud percentage"
                />

                <StatCard
                  title="Expected Cost"
                  value={
                    formatCurrency(
                      summary?.expected_cost
                    )
                  }
                  subtitle="Current expected loss"
                />

                <StatCard
                  title="Model Version"
                  value={
                    summary?.model_version ?? "—"
                  }
                  subtitle="Active model"
                />
              </section>

              <section className="dashboard-grid">
                <div className="dashboard-card">
                  <ProbabilityChart
                    data={probabilityData}
                  />
                </div>

                <div className="dashboard-card">
                  {costData.length > 0 ? (
                    <CostChart data={costData} />
                  ) : (
                    <EmptyState message="No cost analytics available." />
                  )}
                </div>
              </section>

              <section className="dashboard-info">
                <div className="dashboard-card">
                  <h3>System Overview</h3>

                  <p>
                    The dashboard provides cost-sensitive
                    fraud detection results and supports
                    operator feedback for future model
                    improvement.
                  </p>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;