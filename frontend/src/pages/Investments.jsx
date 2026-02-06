import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export default function Investments() {
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState({ totalValue: 0, totalGain: 0, totalReturn: 0 });
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/api/investments/holdings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHoldings(res.data.holdings || []);
        setSummary(res.data.summary || { totalValue: 0, totalGain: 0, totalReturn: 0 });
      } catch (err) {
        console.error("Investments load error:", err);
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const portfolio = holdings.map((h) => ({
    symbol: h.symbol,
    type: h.instrumentType,
    shares: h.quantity,
    buy: h.avgBuy,
    price: h.currentPrice,
    value: h.currentValue,
    gain: h.gain,
    ret: h.ret,
  }));

  // simple trend using total value (demo but based on real value)
  const base = summary.totalValue || 0;
  const chart = [
    { d: "Jun", v: base * 0.9 },
    { d: "Jul", v: base * 0.95 },
    { d: "Aug", v: base * 0.98 },
    { d: "Sep", v: base },
  ];

  const totalValue = summary.totalValue || 0;
  const totalGain = summary.totalGain || 0;
  const totalReturn = summary.totalReturn || 0;

  const fmtINR = (v) =>
    "₹" + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  if (loading) {
    return <p>Loading investments...</p>;
  }

  return (
    <>
      <h2 className="page-title">Investment Portfolio</h2>

      <div className="tile-grid">
        <div className="tile t-cyan">
          <div className="tile-title">Total Portfolio Value</div>
          <div className="tile-value">{fmtINR(totalValue)}</div>
        </div>
        <div className="tile t-green">
          <div className="tile-title">Total Gain/Loss</div>
          <div className="tile-value">
            {totalGain >= 0 ? "+" : "−"}
            {fmtINR(Math.abs(totalGain))}
          </div>
        </div>
        <div className="tile t-yellow">
          <div className="tile-title">Open Positions</div>
          <div className="tile-value">{portfolio.length}</div>
        </div>
      </div>

      <div className="section-row">
        <div className="card">
          <div className="card-head">
            <h3>Investment Holdings</h3>
          </div>
          <div className="card-body">
            {portfolio.length === 0 ? (
              <p className="text-muted">No holdings yet. Use Buy to add positions.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Investment</th>
                    <th>Type</th>
                    <th className="tar">Shares</th>
                    <th className="tar">Purchase</th>
                    <th className="tar">Current</th>
                    <th className="tar">Value</th>
                    <th className="tar">Gain/Loss</th>
                    <th className="tar">Return %</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((p, i) => (
                    <tr key={i}>
                      <td>{p.symbol}</td>
                      <td>{p.type}</td>
                      <td className="tar">{p.shares}</td>
                      <td className="tar">₹{p.buy.toFixed(2)}</td>
                      <td className="tar">₹{p.price.toFixed(2)}</td>
                      <td className="tar">₹{p.value.toFixed(2)}</td>
                      <td className={`tar ${p.gain >= 0 ? "pos" : "neg"}`}>
                        {p.gain >= 0 ? "+" : "−"}₹{Math.abs(p.gain).toFixed(2)}
                      </td>
                      <td className={`tar ${p.ret >= 0 ? "pos" : "neg"}`}>
                        {p.ret >= 0 ? "+" : "−"}
                        {Math.abs(p.ret).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="actions-inline">
              <button className="btn">Buy Securities</button>
              <button className="btn ghost">Sell Securities</button>
              <button className="btn ghost">Transfer Securities</button>
            </div>
          </div>
        </div>

        <div className="card card-lg">
          <div className="card-head">
            <h3>Portfolio Analysis</h3>
          </div>
          <div className="card-body chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="d" />
                <YAxis />
                <Tooltip />
                <Line dataKey="v" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

