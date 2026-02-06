// frontend/src/components/HeatmapGrid.jsx
import React from "react";

function colorForPct(pct) {
  if (pct === "N/A" || pct == null) return "#e9ecef";
  // remove % sign if present
  const n = Number(String(pct).replace("%", ""));
  if (Number.isNaN(n)) return "#e9ecef";
  // clamp
  const v = Math.max(-12, Math.min(12, n));
  // map -12..0..12 to red->grey->green
  if (v >= 0) {
    // green gradient (light to bright)
    const g = Math.round(140 + (115 * (v / 12)));
    return `rgb(0,${g},70)`;
  } else {
    // red gradient
    const r = Math.round(220 + (35 * (-v / 12)));
    return `rgb(${r},40,40)`;
  }
}

export default function HeatmapGrid({ items = [], cols = 4 }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 10
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          padding: 10,
          borderRadius: 10,
          background: colorForPct(it.growth),
          color: "#fff",
          boxShadow: "0 4px 10px rgba(0,0,0,0.06)"
        }}>
          <div className="d-flex justify-content-between align-items-start">
            <div className="fw-bold">{it.symbol}</div>
            <div className="small text-light" style={{ opacity: 0.9 }}>{it.source?.toUpperCase()}</div>
          </div>
          <div className="mt-2">
            <div className="h5 mb-0">{typeof it.price === "number" ? `₹${Number(it.price).toLocaleString()}` : it.price}</div>
            <div className="small">{it.growth ?? "—"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
