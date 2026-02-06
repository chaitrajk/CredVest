import React, { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function InvestBuy() {
  const [name, setName] = useState("");
  const [units, setUnits] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const totalValue = units && price ? units * price : 0;

  const handleAddInvestment = async () => {
    if (!name || !units || !price) {
      return alert("Please fill all fields");
    }

    try {
      setLoading(true);

      await axios.post(
        `${API}/api/investments/buy`,
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

      alert("✅ Investment added to your portfolio");

      setName("");
      setUnits("");
      setPrice("");
    } catch (err) {
      alert("Failed to add investment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-4">
      <h2 className="mb-2">➕ Add Investment</h2>
      <p className="text-muted">
        Use this form to add a new investment to your portfolio.  
        This simulates purchasing an asset such as a stock or fund.
      </p>

      <label className="fw-semibold mt-3">Investment Name / Symbol</label>
      <input
        type="text"
        placeholder="e.g. TCS, AAPL, INFY"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="fw-semibold mt-3">Units Purchased</label>
      <input
        type="number"
        placeholder="Number of units"
        value={units}
        onChange={(e) => setUnits(e.target.value)}
      />

      <label className="fw-semibold mt-3">Price per Unit (₹)</label>
      <input
        type="number"
        placeholder="Price per unit"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />

      <div className="mt-3 text-muted">
        <strong>Total Investment Value:</strong>{" "}
        ₹{Number(totalValue).toLocaleString("en-IN")}
      </div>

      <button
        className="btn btn-primary mt-4"
        onClick={handleAddInvestment}
        disabled={loading}
      >
        {loading ? "Adding..." : "Add to Portfolio"}
      </button>

      <hr className="my-4" />

      <p className="text-muted small">
        ℹ️ Once added, this investment will appear in:
        <br />• Portfolio Overview  
        <br />• Holdings Summary  
        <br />• Dashboard Investment Metrics
      </p>
    </div>
  );
}
