// frontend/src/components/MiniSparkline.jsx
import React from "react";

/**
 * Tiny SVG sparkline (no extra deps)
 * props:
 *   data: number[] (recent closes)
 *   width, height
 *   stroke: color
 */
export default function MiniSparkline({ data = [], width = 120, height = 28, stroke = "#007bff" }) {
  if (!data || !data.length) return <div style={{ width, height }} className="text-muted small">—</div>;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pointsArr = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - ((v - min) / range) * height;
    return { x, y, v };
  });

  const points = pointsArr.map(p => `${p.x},${p.y}`).join(" ");

  const first = data[0];
  const last = data[data.length - 1];
  const delta = ((last - first) / (first || last || 1)) * 100;
  const dotColor = delta >= 0 ? "#28a745" : "#dc3545";

  // last point y
  const lastY = pointsArr[pointsArr.length - 1]?.y ?? height / 2;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <polyline fill="none" stroke={stroke} strokeWidth="1.6" points={points} strokeOpacity="0.95" />
      <circle cx={width - 2} cy={lastY} r="3" fill={dotColor} stroke="#fff" strokeWidth="0.6" />
    </svg>
  );
}
