// src/components/StockSparkline.jsx
import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";

export default function StockSparkline({ symbol }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:4000/api"}/api/features/sparklines?symbol=${encodeURIComponent(symbol)}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }
    })
      .then(r=>r.json())
      .then(j=> { if (!mounted) return; setData(j.closes || []); })
      .catch(e=>console.error("sparkline",e));
    return ()=> mounted=false;
  }, [symbol]);

  if(!data || !data.length) return <div style={{width:100,height:30}} className="text-muted">—</div>;

  const chartData = {
    labels: data.map((_,i)=>i),
    datasets: [{ data, borderWidth: 1, fill: false, pointRadius: 0 }]
  };
  const opts = { responsive: true, maintainAspectRatio: false, elements: { line: { tension: 0.3 } }, scales: { x: { display: false }, y: { display: false } }, plugins: { legend:{display:false} } };

  return <div style={{ width: 100, height: 30 }}><Line data={chartData} options={opts} /></div>;
}

