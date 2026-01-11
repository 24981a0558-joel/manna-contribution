import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import "../styles/AuditLog.css";

function AuditLog() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const logsRef = collection(db, "auditLog");
    const q = query(logsRef, orderBy("timestamp", "desc"), limit(200));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      }));
      setLogs(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const getActionIcon = (action) => {
    switch (action) {
      case "add":
        return "➕";
      case "edit":
        return "✏️";
      case "delete":
        return "🗑️";
      case "bulk_upload":
        return "📁";
      default:
        return "📝";
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "add":
        return "#28a745";
      case "edit":
        return "#ffc107";
      case "delete":
        return "#dc3545";
      case "bulk_upload":
        return "#17a2b8";
      default:
        return "#6c757d";
    }
  };

  const formatTimestamp = (date) => {
    if (!date) return "Unknown";
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const filteredLogs =
    filter === "all" ? logs : logs.filter((log) => log.action === filter);

  if (!isAdmin) {
    return (
      <div className="audit-container">
        <div className="access-denied">
          <div className="denied-icon">🔒</div>
          <h2>Access Denied</h2>
          <p>Only administrators can view the audit log.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="audit-container">
        <div className="audit-loading">
          <div className="loading-icon">📋</div>
          <p>Loading audit log...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-container">
      <div className="audit-header">
        <div className="header-content">
          <div>
            <h1>📋 Audit Log</h1>
            <p>Track all changes made to contributions</p>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Actions</option>
            <option value="add">➕ Added</option>
            <option value="edit">✏️ Edited</option>
            <option value="delete">🗑️ Deleted</option>
            <option value="bulk_upload">📁 Uploads</option>
          </select>
        </div>
      </div>

      <div className="audit-content">
        <div className="audit-stats">
          <div className="stat-item">
            <span className="stat-number">{logs.length}</span>
            <span className="stat-label">Total Actions</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {logs.filter((l) => l.action === "add").length}
            </span>
            <span className="stat-label">Added</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {logs.filter((l) => l.action === "edit").length}
            </span>
            <span className="stat-label">Edited</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {logs.filter((l) => l.action === "delete").length}
            </span>
            <span className="stat-label">Deleted</span>
          </div>
        </div>

        <div className="audit-list">
          {filteredLogs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>No audit logs found</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="audit-item">
                <div
                  className="action-badge"
                  style={{ backgroundColor: getActionColor(log.action) }}
                >
                  {getActionIcon(log.action)}
                </div>
                <div className="audit-details">
                  <div className="audit-main">
                    <span className="action-text">
                      {log.action === "add" && "Added new contribution"}
                      {log.action === "edit" && "Edited contribution"}
                      {log.action === "delete" && "Deleted contribution"}
                      {log.action === "bulk_upload" &&
                        `Uploaded ${log.data?.count || "multiple"} records`}
                    </span>
                    <span className="event-tag">{log.event}</span>
                  </div>
                  <div className="audit-meta">
                    <span className="user-email">👤 {log.userEmail}</span>
                    <span className="timestamp">
                      🕐 {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  {log.data && log.action !== "bulk_upload" && (
                    <div className="audit-data">
                      {log.data.NAME && <span>Name: {log.data.NAME}</span>}
                      {log.data.AMOUNT && (
                        <span>Amount: ₹{log.data.AMOUNT}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default AuditLog;
