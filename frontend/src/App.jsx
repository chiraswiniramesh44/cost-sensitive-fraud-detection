
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import RiskAnalytics from "./pages/RiskAnalytics";
import ReviewQueue from "./pages/ReviewQueue";
import CaseDetail from "./pages/CaseDetail";
import FeedbackAnalytics from "./pages/FeedbackAnalytics";
import ModelMonitoring from "./pages/ModelMonitoring";
import PredictTransaction from "./pages/PredictTransaction";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token");
  const demoMode =
    import.meta.env.VITE_DEMO_MODE === "true";

  if (!token && !demoMode) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const demoMode =
    import.meta.env.VITE_DEMO_MODE === "true";

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/predict-transaction"
          element={
            <ProtectedRoute>
              <PredictTransaction />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/risk-analytics"
          element={
            <ProtectedRoute>
              <RiskAnalytics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/review-queue"
          element={
            <ProtectedRoute>
              <ReviewQueue />
            </ProtectedRoute>
          }
        />

        <Route
          path="/case/:id"
          element={
            <ProtectedRoute>
              <CaseDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/feedback-analytics"
          element={
            <ProtectedRoute>
              <FeedbackAnalytics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/model-monitoring"
          element={
            <ProtectedRoute>
              <ModelMonitoring />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            <Navigate
              to={demoMode ? "/dashboard" : "/login"}
              replace
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to={demoMode ? "/dashboard" : "/login"}
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
