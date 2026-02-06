import React, { useState, useEffect } from "react";
import api from "../lib/api";

export default function LoanManagement() {
  const [loanType, setLoanType] = useState("Personal Loan");
  const [amount, setAmount] = useState("");
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Normalize response -> array
  const normalizeLoans = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.loans) return res.loans;
    if (res.data) return res.data;
    return [];
  };

  // Fetch existing loans
  const fetchLoans = async () => {
    try {
      setFetching(true);

      // ✅ FIXED — removed extra /api prefix
      const res = await api.post("/loan/get", {});

      const payload = res?.data ?? res;
      setLoans(normalizeLoans(payload));
    } catch (error) {
      console.error("Loan fetch error:", error);
      alert(
        error?.response?.data?.message ||
          "Failed to fetch loans. Check server & network."
      );
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  // Create loan
  const handlePayLoan = async () => {
    if (!amount || Number(amount) <= 0) return alert("Enter a valid amount");

    try {
      setLoading(true);

      const payload = {
        type: loanType,
        amount: Number(amount),
      };

      // ✅ FIXED — removed extra /api prefix
      const res = await api.post("/loan/create", payload);

      console.log("Loan created:", res.data ?? res);

      alert("Loan Created Successfully");
      setAmount("");
      await fetchLoans();
    } catch (err) {
      console.error("Loan create error:", err);
      alert(
        err?.response?.data?.message ||
          "Failed to create loan. Check server logs or payload."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Loan Management</h2>

      <div className="loan-form" style={{ maxWidth: 420 }}>
        <label>Select Loan Type</label>
        <select
          value={loanType}
          onChange={(e) => setLoanType(e.target.value)}
          style={{ width: "100%", marginBottom: 8 }}
          disabled={loading}
        >
          <option>Personal Loan</option>
          <option>Home Loan</option>
          <option>Car Loan</option>
        </select>

        <label>Amount (₹)</label>
        <input
          type="number"
          placeholder="Enter Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: "100%", marginBottom: 12 }}
          disabled={loading}
        />

        <button onClick={handlePayLoan} disabled={loading}>
          {loading ? "Processing..." : "Create Loan / Pay EMI"}
        </button>
      </div>

      <hr />

      <h3>Your Loans</h3>

      {fetching ? (
        <p>Loading loans...</p>
      ) : loans.length === 0 ? (
        <p>No loans found</p>
      ) : (
        <ul>
          {loans.map((loan, i) => (
            <li key={loan._id ?? i}>
              <b>{loan.type}</b> — ₹{loan.amount}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
