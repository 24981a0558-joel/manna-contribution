import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db, CHURCH_EVENTS } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import "../styles/Contributions.css";

function Contributions() {
  const { user, canEdit, canDelete } = useAuth();

  // Event Selection
  const [selectedEvent, setSelectedEvent] = useState(CHURCH_EVENTS[0].id);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Data
  const [headers] = useState(["SNO", "DATE", "NAME", "PHONE", "AMOUNT"]);
  const [rows, setRows] = useState([]);
  const [lastSno, setLastSno] = useState(0);

  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "SNO",
    direction: "asc",
  });

  // Modal States
  const [editingRow, setEditingRow] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [newRowData, setNewRowData] = useState({});

  // Online Status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const formRefs = useRef({});

  // Get current event details
  const currentEvent =
    CHURCH_EVENTS.find((e) => e.id === selectedEvent) || CHURCH_EVENTS[0];

  // Collection path
  const getCollectionPath = () =>
    `events/${selectedEvent}-${selectedYear}/contributions`;
  const getMetaPath = () =>
    `events/${selectedEvent}-${selectedYear}/meta/counter`;

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Real-time data sync
  useEffect(() => {
    setLoading(true);
    setError(null);

    const contributionsRef = collection(db, getCollectionPath());
    const q = query(contributionsRef, orderBy("sno", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data(),
        }));
        setRows(data);
        setLoading(false);

        if (data.length > 0) {
          const maxSno = Math.max(
            ...data.map((r) => parseInt(r.data.SNO) || 0)
          );
          setLastSno(maxSno);
        }
      },
      (err) => {
        console.error("Error fetching data:", err);
        setError(`Failed to load data: ${err.message}`);
        setLoading(false);
      }
    );

    // Fetch counter
    const fetchCounter = async () => {
      try {
        const counterDoc = await getDoc(doc(db, getMetaPath()));
        if (counterDoc.exists()) {
          setLastSno(counterDoc.data().lastSno || 0);
        }
      } catch (err) {
        console.log("No counter found");
      }
    };
    fetchCounter();

    return () => unsubscribe();
  }, [selectedEvent, selectedYear]);

  // Log audit action
  const logAudit = async (action, data, previousData = null) => {
    try {
      await addDoc(collection(db, "auditLog"), {
        action,
        event: `${selectedEvent}-${selectedYear}`,
        data,
        previousData,
        userEmail: user?.email || "unknown",
        userName: user?.displayName || user?.email || "unknown",
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Audit log failed:", err);
    }
  };

  // Save contribution
  const saveContribution = async (contributionId, data, isNew = false) => {
    try {
      setSaveStatus("saving");
      const contributionRef = doc(db, getCollectionPath(), contributionId);

      await setDoc(contributionRef, {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || "unknown",
      });

      await logAudit(isNew ? "add" : "edit", data);

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (err) {
      console.error("Save error:", err);
      setSaveStatus("error");
      setError(`Save failed: ${err.message}`);
    }
  };

  // Update counter
  const updateCounter = async (newSno) => {
    try {
      await setDoc(doc(db, getMetaPath()), { lastSno: newSno });
      setLastSno(newSno);
    } catch (err) {
      console.error("Counter update failed:", err);
    }
  };

  // Search
  const filteredRows = useMemo(() => {
    if (!search) return rows;
    return rows.filter((row) =>
      Object.values(row.data)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [rows, search]);

  // Sort
  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      let aVal = a.data[sortConfig.key] || "";
      let bVal = b.data[sortConfig.key] || "";

      // Numeric sorting for SNO and AMOUNT
      if (sortConfig.key === "SNO" || sortConfig.key === "AMOUNT") {
        aVal = parseFloat(String(aVal).replace(/[^0-9.-]/g, "")) || 0;
        bVal = parseFloat(String(bVal).replace(/[^0-9.-]/g, "")) || 0;
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortConfig]);

  const handleSort = (header) => {
    setSortConfig((prev) => ({
      key: header,
      direction:
        prev.key === header && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Total Amount
  const totalAmount = useMemo(() => {
    return filteredRows.reduce((sum, row) => {
      const value = row.data.AMOUNT || 0;
      const numValue = parseFloat(String(value).replace(/[^0-9.-]/g, "")) || 0;
      return sum + numValue;
    }, 0);
  }, [filteredRows]);

  // File Upload
  const handleFileUpload = async (e) => {
    if (!canEdit) {
      setError("You don't have permission to upload files");
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setSaveStatus("saving");
        const workbook = XLSX.read(evt.target.result, {
          type: "binary",
          cellDates: true,
        });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, {
          defval: "",
          raw: false,
          dateNF: "d-mmm-yyyy",
        });

        if (!json.length) return;

        let maxSno = lastSno;
        const BATCH_SIZE = 500; // Firestore limit is 500 operations per batch
        const batches = [];
        let currentBatch = writeBatch(db);
        let operationCount = 0;

        for (const row of json) {
          const normalizedRow = {};
          Object.entries(row).forEach(([key, value]) => {
            normalizedRow[key.toUpperCase()] = value;
          });

          const sno = parseInt(normalizedRow.SNO) || ++maxSno;
          normalizedRow.SNO = sno.toString();
          normalizedRow.sno = sno;

          const docRef = doc(collection(db, getCollectionPath()));
          currentBatch.set(docRef, {
            ...normalizedRow,
            uploadedAt: serverTimestamp(),
            uploadedBy: user?.email || "unknown",
          });

          operationCount++;
          if (operationCount >= BATCH_SIZE) {
            batches.push(currentBatch);
            currentBatch = writeBatch(db);
            operationCount = 0;
          }
        }

        // Add the last batch if it has operations
        if (operationCount > 0) {
          batches.push(currentBatch);
        }

        // Commit all batches in parallel
        await Promise.all(batches.map((batch) => batch.commit()));

        await updateCounter(maxSno);
        await logAudit("bulk_upload", { count: json.length });

        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(""), 2000);
      } catch (err) {
        console.error("Upload error:", err);
        setError(`File upload failed: ${err.message}`);
        setSaveStatus("error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // Download Excel
  const handleDownloadExcel = () => {
    if (rows.length === 0) {
      setError("No data to download");
      return;
    }

    const dataForExcel = rows.map((row) => {
      const { sno, updatedAt, updatedBy, uploadedAt, uploadedBy, ...rest } =
        row.data;
      return rest;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, currentEvent.name);

    const today = new Date();
    const dateStr = `${today.getDate()}-${today.toLocaleString("en-US", {
      month: "short",
    })}-${today.getFullYear()}`;
    const filename = `${currentEvent.name}_${selectedYear}_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  // Add New
  const openAddModal = () => {
    if (!canEdit) {
      setError("You don't have permission to add contributions");
      return;
    }

    const emptyData = {};
    headers.forEach((h) => (emptyData[h] = ""));

    emptyData.SNO = (lastSno + 1).toString();

    const today = new Date();
    emptyData.DATE = `${today.getDate()}-${today.toLocaleString("en-US", {
      month: "short",
    })}-${today.getFullYear()}`;

    setNewRowData(emptyData);
    setShowAddModal(true);
  };

  const confirmAddRow = async () => {
    const newSno = parseInt(newRowData.SNO) || lastSno + 1;
    const docRef = doc(collection(db, getCollectionPath()));

    await saveContribution(
      docRef.id,
      {
        ...newRowData,
        sno: newSno,
        addedAt: serverTimestamp(),
        addedBy: user?.email || "unknown",
      },
      true
    );

    await updateCounter(Math.max(newSno, lastSno));
    setShowAddModal(false);
    setNewRowData({});
  };

  // Edit
  const openEditModal = (row) => {
    if (!canEdit) {
      setError("You don't have permission to edit contributions");
      return;
    }
    setEditingRow(row);
    formRefs.current = {};
  };

  const saveEdit = async () => {
    const updatedData = { ...editingRow.data };
    headers.forEach((h) => {
      if (formRefs.current[h]) {
        updatedData[h] = formRefs.current[h].value;
      }
    });

    await saveContribution(editingRow.id, updatedData);
    setEditingRow(null);
  };

  // Delete
  const openDeleteModal = (row) => {
    if (!canDelete) {
      setError("You don't have permission to delete contributions");
      return;
    }
    setDeleteRow(row);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteRow) {
      try {
        setSaveStatus("saving");
        await deleteDoc(doc(db, getCollectionPath(), deleteRow.id));
        await logAudit("delete", deleteRow.data);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(""), 2000);
      } catch (err) {
        setError(`Delete failed: ${err.message}`);
        setSaveStatus("error");
      }
    }
    setShowDeleteModal(false);
    setDeleteRow(null);
  };

  const getRowDisplayName = (row) => {
    if (!row) return "";
    return row.data.NAME || `#${row.data.SNO}`;
  };

  // Year options
  const yearOptions = [];
  for (let y = 2020; y <= 2030; y++) {
    yearOptions.push(y);
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-icon">{currentEvent.icon}</div>
          <div className="loading-text">Loading {currentEvent.name}...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="contributions-container">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          ⚠️ You're offline. Changes will sync when you're back online.
        </div>
      )}

      {/* Event Header */}
      <div
        className="event-header"
        style={{ backgroundColor: currentEvent.color }}
      >
        <div className="event-header-content">
          <div className="event-info">
            <span className="event-icon">{currentEvent.icon}</span>
            <div className="event-text">
              <h1>
                {currentEvent.name} - {selectedYear}
              </h1>
              <p>Manna Full Gospel Church, Vizag</p>
            </div>
          </div>

          <div className="event-selectors">
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
            >
              {CHURCH_EVENTS.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.icon} {event.name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="contributions-main">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Contributions</div>
            <div className="stat-value success">
              ₹{totalAmount.toLocaleString()}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Members</div>
            <div className="stat-value" style={{ color: currentEvent.color }}>
              {filteredRows.length}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Status</div>
            <div className="stat-value">
              {saveStatus === "saving" && (
                <span className="status-saving">💾 Saving...</span>
              )}
              {saveStatus === "saved" && (
                <span className="status-saved">✅ Saved</span>
              )}
              {saveStatus === "error" && (
                <span className="status-error">❌ Error</span>
              )}
              {!saveStatus && (
                <span className={isOnline ? "status-online" : "status-offline"}>
                  {isOnline ? "🟢 Online" : "🟡 Offline"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Action Bar */}
        <div className="action-bar">
          {canEdit && (
            <>
              <label className="file-input-label">
                📁 Upload Excel
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                />
              </label>

              <button className="btn btn-success" onClick={openAddModal}>
                ➕ Add New
              </button>
            </>
          )}

          <button
            className="btn btn-info"
            onClick={handleDownloadExcel}
            disabled={rows.length === 0}
          >
            📥 Download Excel
          </button>

          <div className="spacer"></div>

          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header} onClick={() => handleSort(header)}>
                    {header}
                    {sortConfig.key === header &&
                      (sortConfig.direction === "asc" ? " ▲" : " ▼")}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, idx) => (
                <tr key={row.id} className={idx % 2 === 0 ? "even" : "odd"}>
                  {headers.map((h) => (
                    <td key={h}>{row.data[h]}</td>
                  ))}
                  <td className="actions-cell">
                    {canEdit && (
                      <button
                        className="btn-sm btn-edit"
                        onClick={() => openEditModal(row)}
                      >
                        ✏️
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="btn-sm btn-delete"
                        onClick={() => openDeleteModal(row)}
                      >
                        🗑️
                      </button>
                    )}
                    {!canEdit && !canDelete && (
                      <span className="view-only">View Only</span>
                    )}
                  </td>
                </tr>
              ))}

              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={headers.length + 1} className="empty-state">
                    <div className="empty-icon">{currentEvent.icon}</div>
                    <div className="empty-text">
                      {rows.length === 0
                        ? "No contributions yet. Upload an Excel file or add manually."
                        : "No matching records found."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRow && (
        <div className="modal-overlay" onClick={() => setEditingRow(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Edit Contribution</h3>
              <button
                className="modal-close"
                onClick={() => setEditingRow(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {headers.map((h) => (
                <div className="form-group" key={h}>
                  <label>{h}</label>
                  <input
                    ref={(el) => (formRefs.current[h] = el)}
                    defaultValue={editingRow.data[h] || ""}
                  />
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setEditingRow(null)}
              >
                Cancel
              </button>
              <button className="btn btn-success" onClick={saveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Add New Contribution</h3>
              <button
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {headers.map((h) => (
                <div className="form-group" key={h}>
                  <label>{h}</label>
                  <input
                    value={newRowData[h] || ""}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, [h]: e.target.value })
                    }
                    placeholder={`Enter ${h}`}
                  />
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button className="btn btn-success" onClick={confirmAddRow}>
                Add Contribution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeleteModal(false)}
        >
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header danger">
              <h3>⚠️ Confirm Delete</h3>
              <button
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this contribution?</p>
              <p className="delete-name">{getRowDisplayName(deleteRow)}</p>
              <p className="delete-warning">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Contributions;
