import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        Fraud Detection
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard">
          Dashboard
        </NavLink>

        <NavLink to="/risk-analytics">
          Risk Analytics
        </NavLink>

        <NavLink to="/review-queue">
          Review Queue
        </NavLink>

        <NavLink to="/feedback-analytics">
          Feedback Analytics
        </NavLink>

        <NavLink to="/model-monitoring">
          Model Monitoring
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;