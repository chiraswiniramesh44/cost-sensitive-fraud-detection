import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ProbabilityChart from "../components/ProbabilityChart";
import CostChart from "../components/CostChart";
import StatCard from "../components/StatCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import dashboardService from "../services/dashboardService";
import {
  formatCurrency,
  formatPercentage,
} from "../utils/formatters";

function RiskAnalytics() {
  const [summary, setSummary] = useState(null);
  const [costData, setCostData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError("");

      try {
        const [summaryResponse, costResponse] =
          await Promise.all([
            dashboardService.getSummary(),
            dashboardService.getCostAnalytics(),
          ]);

        setSummary(summaryResponse);

        setCostData(
          costResponse?.data ||
            costResponse ||
            []
        );
      } catch (err) {
        console.error(
          "Risk analytics loading error:",
          err
        );

        setError(
          err.response?.data?.detail ||
            "Unable to load risk analytics."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const probabilityData =
    summary?.probability_distribution || [];

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />

        <div className="main-area">
          <Navbar />

          <main className="page-content">
            <LoadingSpinner message="Loading risk analytics..." />
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
              <h1>Risk Analytics</h1>

              <p>
                Analyze fraud probability, risk levels,
                and cost-sensitive predictions.
              </p>
            </div>
          </div>

          {error && (
            <ErrorMessage message={error} />
          )}

          {!summary && !error ? (
            <EmptyState message="No risk analytics data available." />
          ) : (
            <>
              <section className="stats-grid">
                <StatCard
                  title="Fraud Rate"
                  value={formatPercentage(
                    summary?.fraud_rate
                  )}
                  subtitle="Overall detected fraud"
                />

                <StatCard
                  title="Fraud Cases"
                  value={
                    summary?.fraud_cases ?? "—"
                  }
                  subtitle="Detected fraud transactions"
                />

                <StatCard
                  title="Review Cases"
                  value={
                    summary?.review_cases ?? "—"
                  }
                  subtitle="Cases requiring operator review"
                />

                <StatCard
                  title="Expected Cost"
                  value={formatCurrency(
                    summary?.expected_cost
                  )}
                  subtitle="Estimated decision cost"
                />
              </section>

              <section className="dashboard-grid">
                <div className="dashboard-card">
                  {probabilityData.length > 0 ? (
                    <ProbabilityChart
                      data={probabilityData}
                    />
                  ) : (
                    <EmptyState
                      message="No probability distribution data available."
                    />
                  )}
                </div>

                <div className="dashboard-card">
                  {costData.length > 0 ? (
                    <CostChart data={costData} />
                  ) : (
                    <EmptyState
                      message="No cost analytics data available."
                    />
                  )}
                </div>
              </section>

              <section className="dashboard-card">
                <h3>Risk Analysis Overview</h3>

                <p>
                  This section provides analytical
                  information about fraud probability,
                  operator review requirements, and
                  expected decision costs.
                </p>

                <p>
                  The risk analytics are intended to
                  support cost-sensitive decision making
                  rather than relying only on prediction
                  probability.
                </p>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default RiskAnalytics;