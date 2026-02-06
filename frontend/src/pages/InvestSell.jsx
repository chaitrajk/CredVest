import React, { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function InvestSell() {
  const [name, setName] = useState("");
  const [units, setUnits] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const estimatedReturn = units && price ? units * price : 0;

  const handleWithdrawInvestment = async () => {
    if (!name || !units || !price) {
      return alert("Please fill all fields");
    }

    try {
      setLoading(true);

      await axios.post(
        `${API}/api/investments/sell`,
        {
          symbol: name,
          instrumentType: "Stock",
          quantity: Number(units),
          price: Number(price),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("✅ Investment withdrawal recorded");

      setName("");
      setUnits("");
      setPrice("");
    } catch (err) {
      alert("Failed to withdraw investment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-4">
      <h2 className="mb-2">➖ Withdraw Investment</h2>
      <p className="text-muted">
        Use this form to sell or withdraw part of an existing investment.  
        This reduces your portfolio holdings and updates gains/losses.
      </p>

      <label className="fw-semibold mt-3">Investment Name / Symbol</label>
      <input
        type="text"
        placeholder="e.g. TCS, AAPL"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="fw-semibold mt-3">Units to Withdraw</label>
      <input
        type="number"
        placeholder="Units to sell"
        value={units}
        onChange={(e) => setUnits(e.target.value)}
      />

      <label className="fw-semibold mt-3">Selling Price per Unit (₹)</label>
      <input
        type="number"
        placeholder="Current market price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />

      <div className="mt-3 text-muted">
        <strong>Estimated Return:</strong>{" "}
        ₹{Number(estimatedReturn).toLocaleString("en-IN")}
      </div>

      <button
        className="btn btn-danger mt-4"
        onClick={handleWithdrawInvestment}
        disabled={loading}
      >
        {loading ? "Processing..." : "Withdraw from Portfolio"}
      </button>

      <hr className="my-4" />

      <p className="text-muted small">
        ℹ️ After withdrawal:
        <br />• Portfolio holdings are updated  
        <br />• Gains/Losses are recalculated  
        <br />• Transaction appears in history
      </p>
    </div>
  );
}
