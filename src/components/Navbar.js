import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../config/firebase";
import { signOut } from "firebase/auth";
import "../styles/Navbar.css";

function Navbar() {
  const { currentUser, userRole, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!currentUser) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">⛪</span>
        <span className="brand-text">Manna Church</span>
      </div>

      <div className="navbar-links">
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          📊 Dashboard
        </NavLink>
        <NavLink
          to="/contributions"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          💰 Contributions
        </NavLink>
        {isAdmin && (
          <>
            <NavLink
              to="/audit-log"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              📋 Audit Log
            </NavLink>
            <NavLink
              to="/users"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              👥 Users
            </NavLink>
          </>
        )}
      </div>

      <div className="navbar-user">
        <div className="user-info">
          <span className="user-email">{currentUser.email}</span>
          <span className="user-role">{userRole}</span>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
