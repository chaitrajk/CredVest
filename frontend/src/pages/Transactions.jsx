// frontend/src/pages/Transactions.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

// --- FIXED API ROOT -------------------------------------------------------
const RAW = import.meta.env.VITE_API_URL || "http://localhost:4000";
const BASE = RAW.replace(/\/+$/, "");
const API = BASE + "/api"; // ALWAYS ensure `/api` prefix
// --------------------------------------------------------------------------

const MONTHS = [
  "All",
  "January", "February", "March",
  "April", "May", "June",
  "July", "August", "September",
  "October", "November", "December",
];

export default function Transactions() {
  const [month, setMonth] = useState(0);
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState("month");

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const token = localStorage.getItem("token");

  /** ---------------------------------------------------
   * LOAD TRANSACTIONS + SUMMARY
   * --------------------------------------------------- */
  const loadData = async () => {
    if (!token) return;

    setLoading(true);
    setErr("");

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const listParams = {};
      if (month > 0) {
        listParams.month = month;
        listParams.year = year;
      }

      const [resList, resSummary] = await Promise.all([
        axios.get(`${API}/transactions/list`, {
          params: listParams,
          headers,
        }),
        axios.get(`${API}/transactions/summary`, {
          params: { period },
          headers,
        }),
      ]);

      setTransactions(resList.data?.transactions || []);
      setSummary(resSummary.data || null);

    } catch (e) {
      console.error("[Transactions] API error:", e);
      setErr(e.response?.data?.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month, year, period]);

  /** ---------------------------------------------------
   * DOWNLOAD CSV
   * --------------------------------------------------- */
  const handleDownload = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const params = {};
      if (month > 0) {
        params.month = month;
        params.year = year;
      }

      const res = await axios.get(`${API}/transactions/export`, {
        params,
        headers,
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "transactions.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (e) {
      console.error(e);
      alert("Failed to download CSV");
    }
  };

  /** ---------------------------------------------------
   * CATEGORY BREAKDOWN
   * --------------------------------------------------- */
  const renderCategoryList = () => {
    if (!summary?.byCategory) return null;

    const entries = Object.entries(summary.byCategory);
    if (!entries.length) return null;

    return (
      <div style={{
        marginTop: "1rem",
        padding: "1rem",
        borderRadius: "12px",
        background: "#111827",
        color: "white",
      }}>
        <h4 style={{ marginBottom: "0.75rem" }}>Spending by Category</h4>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {entries.map(([cat, total]) => (
            <li key={cat}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.35rem 0",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span>{cat}</span>
              <span>₹{Number(total || 0).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div
      style={{
        padding: "2rem",
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #1f2937, #020617)",
        color: "#e5e7eb",
      }}
    >
      {/* ---------------------------------------------------
          HEADER + FILTERS
      --------------------------------------------------- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Transaction History</h2>
          <p style={{ margin: 0, opacity: 0.7 }}>
            Track credits, debits, categories and download reports.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>

          {/* Month Filter */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            style={dropdownStyle}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

          {/* Year */}
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ ...dropdownStyle, width: "6rem" }}
          />

          {/* Summary Period */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={dropdownStyle}
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>

          <button onClick={handleDownload} style={downloadBtn}>
            ⬇ Download CSV
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------
          ERROR MESSAGE
      --------------------------------------------------- */}
      {err && (
        <div style={errorBox}>
          {err}
        </div>
      )}

      {loading && <p>Loading...</p>}

      {/* ---------------------------------------------------
          SUMMARY CARDS
      --------------------------------------------------- */}
      {summary && (
        <div style={summaryGrid}>
          <div style={creditCard}>
            <h4>Total Credit ({summary.period})</h4>
            <p style={amountText}>
              ₹{Number(summary.totalCredit || 0).toFixed(2)}
            </p>
          </div>

          <div style={debitCard}>
            <h4>Total Debit ({summary.period})</h4>
            <p style={amountText}>
              ₹{Number(summary.totalDebit || 0).toFixed(2)}
            </p>
          </div>

          <div style={balanceCard}>
            <h4>Net Balance</h4>
            <p style={{
              ...amountText,
              color: Number(summary.balance || 0) >= 0 ? "#4ade80" : "#f97373",
            }}>
              ₹{Number(summary.balance || 0).toFixed(2)}
            </p>
          </div>

          {renderCategoryList()}
        </div>
      )}

      {/* ---------------------------------------------------
          TRANSACTIONS TABLE
      --------------------------------------------------- */}
      <div style={tableWrapper}>
        <table style={tableStyle}>
          <thead style={{ background: "#111827" }}>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Running Balance</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && !loading && (
              <tr>
                <td colSpan={6} style={emptyRow}>
                  No transactions found.
                </td>
              </tr>
            )}

            {transactions.map((t) => (
              <tr key={t._id}>
                <td style={tdStyle}>{new Date(t.date).toLocaleDateString()}</td>
                <td style={tdStyle}>{t.description}</td>
                <td style={tdStyle}>{t.category || "Others"}</td>

                <td
                  style={{
                    ...tdStyle,
                    color: t.type === "CREDIT" ? "#4ade80" : "#f97373",
                    fontWeight: 600,
                  }}
                >
                  {t.type}
                </td>

                {/* SAFE .toFixed() */}
                <td style={tdStyle}>
                  ₹{Number(t.amount || 0).toFixed(2)}
                </td>

                <td style={tdStyle}>
                  ₹{Number(t.runningBalance || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------- */
/*  STYLES                            */
/* ---------------------------------- */
const dropdownStyle = {
  padding: "0.4rem 0.6rem",
  borderRadius: "8px",
  border: "1px solid #4b5563",
  background: "#020617",
  color: "white",
};

const downloadBtn = {
  padding: "0.45rem 0.9rem",
  borderRadius: "999px",
  border: "none",
  background: "linear-gradient(135deg, #22c55e, #4ade80, #22c55e)",
  color: "#020617",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const errorBox = {
  marginBottom: "1rem",
  padding: "0.75rem 1rem",
  borderRadius: "10px",
  background: "#7f1d1d",
  color: "#fecaca",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "1rem",
  marginBottom: "1.5rem",
};

const creditCard = {
  padding: "1rem",
  borderRadius: "16px",
  background: "linear-gradient(145deg, #16a34a, #22c55e)",
  color: "#022c22",
};

const debitCard = {
  padding: "1rem",
  borderRadius: "16px",
  background: "linear-gradient(145deg, #b91c1c, #ef4444)",
  color: "#fee2e2",
};

const balanceCard = {
  padding: "1rem",
  borderRadius: "16px",
  background: "linear-gradient(145deg, #0f172a, #1f2937)",
  border: "1px solid #4b5563",
};

const amountText = {
  marginTop: "0.5rem",
  fontSize: "1.2rem",
  fontWeight: 700,
};

const tableWrapper = {
  borderRadius: "16px",
  overflow: "hidden",
  background: "#020617",
  border: "1px solid #4b5563",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.9rem",
};

const thStyle = {
  padding: "0.7rem",
  textAlign: "left",
  borderBottom: "1px solid #374151",
  fontWeight: 600,
  color: "#d1d5db",
};

const tdStyle = {
  padding: "0.6rem 0.7rem",
  borderBottom: "1px solid #111827",
  color: "#e5e7eb",
};

const emptyRow = {
  padding: "0.8rem",
  textAlign: "center",
  color: "#9ca3af",
};
