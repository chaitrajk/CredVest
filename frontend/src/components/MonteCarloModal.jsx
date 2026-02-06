// frontend/src/components/MonteCarloModal.jsx
import React, { useState } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Title,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Title);

export default function MonteCarloModal({ show, onHide, symbol, startPrice, apiBase }) {
  const [loading, setLoading] = useState(false);
  const [histData, setHistData] = useState(null);

  const runSim = async (params = {}) => {
    setLoading(true);
    setHistData(null);
    try {
      const token = localStorage.getItem("token") || "";
      const body = {
        symbol,
        startPrice,
        months: params.months || 12,
        sims: params.sims || 2000,
        mu: params.mu ?? 0.10,
        sigma: params.sigma ?? 0.25,
      };
      const res = await fetch(`${apiBase}/api/features/montecarlo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Monte Carlo failed");

      // build histogram from samples
      const samples = json.samples || [];
      if (!samples.length) throw new Error("No samples returned");

      // generate bins
      const bins = 40;
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      const binSize = (max - min) / bins || 1;
      const counts = new Array(bins).fill(0);
      samples.forEach(v => {
        const idx = Math.min(bins - 1, Math.floor((v - min) / binSize));
        counts[idx] += 1;
      });
      const labels = counts.map((_, i) => Math.round(min + i * binSize));
      setHistData({ labels, counts, meta: { median: json.median, p90: json.p90 } });
    } catch (err) {
      console.error("Monte Carlo error", err);
      setHistData({ error: err.message || String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Monte Carlo — {symbol}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <small className="text-muted">Start price: {startPrice ? `₹${startPrice}` : "—"}</small>
        </div>

        {!histData && (
          <div className="text-center py-5">
            {loading ? (
              <>
                <Spinner animation="border" />
                <div className="mt-2">Running simulations…</div>
              </>
            ) : (
              <div>
                <p className="text-muted">Click run to simulate possible future prices.</p>
                <Button onClick={() => runSim()} variant="primary">Run 2,000 sims (12 months)</Button>
              </div>
            )}
          </div>
        )}

        {histData?.error && (
          <div className="text-danger">Error: {histData.error}</div>
        )}

        {histData?.counts && (
          <>
            <div style={{ height: 320 }}>
              <Bar
                data={{
                  labels: histData.labels,
                  datasets: [{ label: "Simulated outcomes", data: histData.counts }]
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    tooltip: { mode: "index", intersect: false },
                    title: { display: true, text: `Median: ₹${Math.round(histData.meta.median)} • P90: ₹${Math.round(histData.meta.p90)}` }
                  },
                  scales: {
                    x: { title: { display: true, text: "Simulated price (₹)" } },
                    y: { title: { display: true, text: "Frequency" } }
                  }
                }}
              />
            </div>
            <div className="mt-3 small text-muted">
              Median: <strong>₹{Math.round(histData.meta.median)}</strong> — 90th percentile: <strong>₹{Math.round(histData.meta.p90)}</strong>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
        <Button variant="primary" onClick={() => runSim()} disabled={loading}>
          {loading ? "Running…" : "Run Again"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
