import React, { useState, useEffect } from "react";
import { collection, query, getDocs } from "firebase/firestore";
import { db, CHURCH_EVENTS } from "../config/firebase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import "../styles/Dashboard.css";

function Dashboard() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [eventData, setEventData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);

  useEffect(() => {
    fetchAllEventData();
  }, [selectedYear]);

  const fetchAllEventData = async () => {
    setLoading(true);
    const data = [];
    let total = 0;
    let members = 0;

    for (const event of CHURCH_EVENTS) {
      try {
        const contributionsRef = collection(
          db,
          `events/${event.id}-${selectedYear}/contributions`
        );
        const snapshot = await getDocs(query(contributionsRef));

        let eventTotal = 0;
        let eventMembers = snapshot.docs.length;

        snapshot.docs.forEach((doc) => {
          const amount =
            parseFloat(
              String(doc.data().AMOUNT || 0).replace(/[^0-9.-]/g, "")
            ) || 0;
          eventTotal += amount;
        });

        data.push({
          name: event.name,
          shortName: event.name.split(" ")[0],
          icon: event.icon,
          color: event.color,
          amount: eventTotal,
          members: eventMembers,
        });

        total += eventTotal;
        members += eventMembers;
      } catch (err) {
        console.error(`Error fetching ${event.name}:`, err);
        data.push({
          name: event.name,
          shortName: event.name.split(" ")[0],
          icon: event.icon,
          color: event.color,
          amount: 0,
          members: 0,
        });
      }
    }

    setEventData(data);
    setTotalAmount(total);
    setTotalMembers(members);
    setLoading(false);
  };

  const yearOptions = [];
  for (let y = 2020; y <= 2030; y++) {
    yearOptions.push(y);
  }

  const pieColors = CHURCH_EVENTS.map((e) => e.color);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">📊</div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>📊 Dashboard</h1>
            <p>Manna Full Gospel Church - Contribution Overview</p>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="year-selector"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card total">
            <div className="card-icon">💰</div>
            <div className="card-info">
              <h3>Total Contributions</h3>
              <p className="card-value">₹{totalAmount.toLocaleString()}</p>
            </div>
          </div>

          <div className="summary-card members">
            <div className="card-icon">👥</div>
            <div className="card-info">
              <h3>Total Records</h3>
              <p className="card-value">{totalMembers}</p>
            </div>
          </div>

          <div className="summary-card events">
            <div className="card-icon">📅</div>
            <div className="card-info">
              <h3>Active Events</h3>
              <p className="card-value">
                {eventData.filter((e) => e.amount > 0).length}
              </p>
            </div>
          </div>

          <div className="summary-card average">
            <div className="card-icon">📈</div>
            <div className="card-info">
              <h3>Average per Event</h3>
              <p className="card-value">
                ₹
                {eventData.filter((e) => e.amount > 0).length > 0
                  ? Math.round(
                      totalAmount / eventData.filter((e) => e.amount > 0).length
                    ).toLocaleString()
                  : 0}
              </p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="charts-row">
          {/* Bar Chart */}
          <div className="chart-card">
            <h3>📊 Event-wise Contributions</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={eventData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="shortName"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `₹${value.toLocaleString()}`,
                      "Amount",
                    ]}
                    labelFormatter={(label) =>
                      eventData.find((e) => e.shortName === label)?.name ||
                      label
                    }
                  />
                  <Bar dataKey="amount" fill="#667eea" radius={[4, 4, 0, 0]}>
                    {eventData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="chart-card">
            <h3>🥧 Contribution Distribution</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={eventData.filter((e) => e.amount > 0)}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {eventData
                      .filter((e) => e.amount > 0)
                      .map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `₹${value.toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Members Chart */}
        <div className="chart-card full-width">
          <h3>👥 Members per Event</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={eventData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="shortName"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="members"
                  stroke="#667eea"
                  strokeWidth={3}
                  dot={{ fill: "#667eea", strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Event Cards */}
        <div className="event-cards">
          <h3>📅 All Events - {selectedYear}</h3>
          <div className="event-grid">
            {eventData.map((event) => (
              <div
                key={event.name}
                className="event-card"
                style={{ borderLeftColor: event.color }}
              >
                <div className="event-card-header">
                  <span className="event-emoji">{event.icon}</span>
                  <span className="event-name">{event.name}</span>
                </div>
                <div className="event-card-stats">
                  <div className="event-stat">
                    <span className="stat-label">Amount</span>
                    <span className="stat-value" style={{ color: event.color }}>
                      ₹{event.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="event-stat">
                    <span className="stat-label">Members</span>
                    <span className="stat-value">{event.members}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
