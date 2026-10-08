import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RiskAnalytics from "./pages/RiskAnalytics";
import ReviewQueue from "./pages/ReviewQueue";
import CaseDetail from "./pages/CaseDetail";
import FeedbackAnalytics from "./pages/FeedbackAnalytics";
import ModelMonitoring from "./pages/ModelMonitoring";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Risk Analytics */}
        <Route
          path="/risk-analytics"
          element={
            <ProtectedRoute>
              <RiskAnalytics />
            </ProtectedRoute>
          }
        />

        {/* Review Queue */}
        <Route
          path="/review-queue"
          element={
            <ProtectedRoute>
              <ReviewQueue />
            </ProtectedRoute>
          }
        />

        {/* Case Detail */}
        <Route
          path="/case/:id"
          element={
            <ProtectedRoute>
              <CaseDetail />
            </ProtectedRoute>
          }
        />

        {/* Feedback Analytics */}
        <Route
          path="/feedback-analytics"
          element={
            <ProtectedRoute>
              <FeedbackAnalytics />
            </ProtectedRoute>
          }
        />

        {/* Model Monitoring */}
        <Route
          path="/model-monitoring"
          element={
            <ProtectedRoute>
              <ModelMonitoring />
            </ProtectedRoute>
          }
        />

        {/* Default */}
        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        {/* Unknown URL */}
        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;