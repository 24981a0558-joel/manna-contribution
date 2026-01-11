import React, { useState, useEffect } from "react";
import { db, USER_ROLES } from "../config/firebase";
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import "../styles/UserManagement.css";

function UserManagement() {
  const { currentUser, userRole, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    role: "viewer",
    name: "",
  });

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = onSnapshot(
      collection(db, "authorizedUsers"),
      (snapshot) => {
        const usersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({ email: "", role: "viewer", name: "" });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.id,
      role: user.role || "viewer",
      name: user.name || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const emailKey = formData.email.toLowerCase().replace(/\./g, ",");

      await setDoc(doc(db, "authorizedUsers", emailKey), {
        email: formData.email.toLowerCase(),
        role: formData.role,
        name: formData.name,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.email,
      });

      setShowModal(false);
      setFormData({ email: "", role: "viewer", name: "" });
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Failed to save user. Please try again.");
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser.email.toLowerCase().replace(/\./g, ",")) {
      alert("You cannot delete your own account!");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to remove "${user.email}" from authorized users?`
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, "authorizedUsers", user.id));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user. Please try again.");
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "admin":
        return "badge-admin";
      case "editor":
        return "badge-editor";
      default:
        return "badge-viewer";
    }
  };

  if (!isAdmin) {
    return (
      <div className="access-denied">
        <div className="denied-icon">🔒</div>
        <h2>Access Denied</h2>
        <p>Only administrators can manage users.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="users-loading">
        <div className="loading-icon">👥</div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="users-container">
      <div className="users-header">
        <div className="header-content">
          <div>
            <h1>👥 User Management</h1>
            <p>Manage authorized users and their roles</p>
          </div>
          <button className="btn-add-user" onClick={handleAddUser}>
            ➕ Add User
          </button>
        </div>
      </div>

      <div className="users-content">
        {/* Role Legend */}
        <div className="role-legend">
          <div className="legend-item">
            <span className="legend-badge badge-admin">Admin</span>
            <span>Full access - can manage users, delete contributions</span>
          </div>
          <div className="legend-item">
            <span className="legend-badge badge-editor">Editor</span>
            <span>Can add and edit contributions</span>
          </div>
          <div className="legend-item">
            <span className="legend-badge badge-viewer">Viewer</span>
            <span>Read-only access</span>
          </div>
        </div>

        {/* Users List */}
        <div className="users-list">
          {users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👤</div>
              <p>No authorized users yet. Add users to grant them access.</p>
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="user-card">
                <div className="user-avatar">
                  {user.name
                    ? user.name.charAt(0).toUpperCase()
                    : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <div className="user-name">
                    {user.name || "No name"}
                    {user.email === currentUser.email && (
                      <span className="you-badge">(You)</span>
                    )}
                  </div>
                  <div className="user-email">{user.email}</div>
                </div>
                <div className="user-role">
                  <span
                    className={`role-badge ${getRoleBadgeClass(user.role)}`}
                  >
                    {USER_ROLES[user.role]?.icon}{" "}
                    {USER_ROLES[user.role]?.label || "Viewer"}
                  </span>
                </div>
                <div className="user-actions">
                  <button
                    className="btn-edit"
                    onClick={() => handleEditUser(user)}
                    title="Edit user"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteUser(user)}
                    disabled={user.email === currentUser.email}
                    title={
                      user.email === currentUser.email
                        ? "Cannot delete yourself"
                        : "Remove user"
                    }
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingUser ? "✏️ Edit User" : "➕ Add New User"}</h2>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="user@example.com"
                  required
                  disabled={editingUser}
                />
                {editingUser && (
                  <small className="form-hint">Email cannot be changed</small>
                )}
              </div>

              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  {Object.entries(USER_ROLES).map(([key, role]) => (
                    <option key={key} value={key}>
                      {role.icon} {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="role-description">
                <strong>
                  {USER_ROLES[formData.role]?.icon}{" "}
                  {USER_ROLES[formData.role]?.label}:
                </strong>
                <ul>
                  {formData.role === "admin" && (
                    <>
                      <li>✅ View all contributions</li>
                      <li>✅ Add new contributions</li>
                      <li>✅ Edit contributions</li>
                      <li>✅ Delete contributions</li>
                      <li>✅ Manage users</li>
                      <li>✅ View audit logs</li>
                    </>
                  )}
                  {formData.role === "editor" && (
                    <>
                      <li>✅ View all contributions</li>
                      <li>✅ Add new contributions</li>
                      <li>✅ Edit contributions</li>
                      <li>❌ Delete contributions</li>
                      <li>❌ Manage users</li>
                      <li>❌ View audit logs</li>
                    </>
                  )}
                  {formData.role === "viewer" && (
                    <>
                      <li>✅ View all contributions</li>
                      <li>❌ Add new contributions</li>
                      <li>❌ Edit contributions</li>
                      <li>❌ Delete contributions</li>
                      <li>❌ Manage users</li>
                      <li>❌ View audit logs</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {editingUser ? "Update User" : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
