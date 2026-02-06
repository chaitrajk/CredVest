// src/pages/Goals.jsx
import React, { useState, useEffect } from "react";
import {
  Container,
  Card,
  Form,
  Button,
  Row,
  Col,
  Alert,
  Spinner,
  Table,
  Modal,
  Badge,
} from "react-bootstrap";
import { Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

// Backend base (from env). Be tolerant of trailing slashes or '/api' included.
const RAW_API = import.meta.env.VITE_API_URL || "http://localhost:4000";
// buildUrl: safely join base and path (no duplicate slashes, no double /api)
function buildUrl(path) {
  // path e.g. "api/goals/plan" or "/api/features/heatmap"
  const base = String(RAW_API).replace(/\/+$/, ""); // strip trailing slashes
  const cleanPath = String(path).replace(/^\/+/, ""); // strip leading slashes
  return `${base}/${cleanPath}`;
}

export default function Goals() {
  // --- form state
  const [goal, setGoal] = useState("");
  const [amount, setAmount] = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState("years");

  // --- main state
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [histErr, setHistErr] = useState("");

  // --- feature UI state
  const [heatmapData, setHeatmapData] = useState([]);
  const [sparkCache, setSparkCache] = useState({}); // symbol -> closes array
  const [moodboard, setMoodboard] = useState(null);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [monteResult, setMonteResult] = useState(null);
  const [backtestResult, setBacktestResult] = useState(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [loadingBacktest, setLoadingBacktest] = useState(false);
  const [loadingMonte, setLoadingMonte] = useState(false);

  const token = localStorage.getItem("token") || "";

  const fmt = (v) => (typeof v === "number" ? v.toLocaleString() : v ?? "—");

  // ------------------ GENERATE PLAN ------------------
  const handleGenerate = async (e) => {
    e.preventDefault();
    setErr("");
    setPlan(null);
    setBacktestResult(null);
    setMonteResult(null);

    const a = Number(amount);
    const dVal = Number(durationValue);

    if (!goal.trim() || !a || a <= 0 || !dVal || dVal <= 0) {
      setErr("Please enter a goal, a valid positive amount, and a valid duration.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        goal: goal.trim(),
        targetAmount: a,
        durationValue: dVal,
        durationUnit: durationUnit,
        amount: a,
        duration: dVal,
      };

      if (durationUnit === "years") payload.years = dVal;
      else payload.months = dVal;

      const res = await fetch(buildUrl("api/goals/plan"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // ignore parse error
      }

      if (!res.ok) {
        const serverMsg = (parsed && (parsed.message || parsed.error)) || text || `Failed (${res.status})`;
        throw new Error(serverMsg);
      }

      const data = parsed ?? {};
      setPlan(data);

      // prefetch sparkline data for returned stocks (background)
      (data.stocks || []).forEach((s) => {
        if (s?.symbol) fetchSparkline(s.symbol);
      });

      loadHistory();
    } catch (e) {
      console.error("Goal load error:", e);
      setErr(e.message || "Something went wrong. Check server logs.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ LOAD HISTORY ------------------
  const loadHistory = async () => {
    setHistErr("");
    setLoadingHist(true);
    try {
      const res = await fetch(buildUrl("api/goals/history"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let msg = `Failed to load history (${res.status})`;
        try {
          const j = await res.json();
          msg = j.message || j.error || msg;
        } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data.history)) list = data.history;
      else if (Array.isArray(data.data)) list = data.data;
      else list = [];
      setHistory(list);
    } catch (e) {
      console.error("History error:", e);
      setHistErr(e.message || "Unable to load history from server.");
      setHistory([]);
    } finally {
      setLoadingHist(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line
  }, []);

  // ------------------ PIE CHART ------------------
  const pieData = plan?.allocation
    ? {
        labels: Object.keys(plan.allocation),
        datasets: [
          {
            data: Object.values(plan.allocation),
            backgroundColor: ["#007bff", "#17a2b8", "#ffc107"],
          },
        ],
      }
    : null;

  // ------------------ DELETE HISTORY ------------------
  const deleteGoal = async (goalId) => {
    if (!confirm("Delete this saved plan? This action cannot be undone.")) return;
    try {
      let res = await fetch(buildUrl(`api/goals/history/${goalId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404 || !res.ok) {
        res = await fetch(buildUrl(`api/goals/${goalId}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (!res.ok) {
        let errMsg = `Failed to delete goal (${res.status})`;
        try {
          const j = await res.json();
          errMsg = j.message || j.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      alert("Goal deleted successfully!");
      loadHistory();
    } catch (e) {
      console.error("Delete goal error:", e);
      alert(e.message || "Failed to delete goal.");
    }
  };

  // ------------------ Heatmap ------------------
  const loadHeatmap = async () => {
    setLoadingHeatmap(true);
    try {
      const res = await fetch(buildUrl("api/features/heatmap"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Heatmap failed");
      const j = await res.json();
      setHeatmapData(j);
    } catch (e) {
      console.error("Heatmap error:", e);
      setHeatmapData([]);
    } finally {
      setLoadingHeatmap(false);
    }
  };

  useEffect(() => {
    loadHeatmap();
    // refresh every 3 minutes
    const tid = setInterval(loadHeatmap, 180000);
    return () => clearInterval(tid);
    // eslint-disable-next-line
  }, []);

  // ------------------ Sparklines ------------------
  const fetchSparkline = async (symbol) => {
    if (!symbol) return;
    if (sparkCache[symbol]) return; // cached
    try {
      const res = await fetch(buildUrl(`api/features/sparklines?symbol=${encodeURIComponent(symbol)}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("sparklines failed");
      const j = await res.json();
      setSparkCache((s) => ({ ...s, [symbol]: j.closes || [] }));
    } catch (e) {
      console.warn("sparkline fetch failed", symbol, e);
      setSparkCache((s) => ({ ...s, [symbol]: [] }));
    }
  };

  // ------------------ Monte Carlo quick run ------------------
  const runMonteCarlo = async (symbol, startPrice) => {
    setMonteResult(null);
    setLoadingMonte(true);
    try {
      const res = await fetch(buildUrl("api/features/montecarlo"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ symbol, startPrice, months: plan?.months ?? 12, sims: 500 }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Monte Carlo failed");
      setMonteResult(j);
    } catch (e) {
      console.error("Monte error", e);
      alert(e.message || "Monte Carlo failed");
    } finally {
      setLoadingMonte(false);
    }
  };

  // ------------------ Backtest (evaluate stored forecast if exists) ------------------
  const runBacktest = async () => {
    if (!plan?.planId) return alert("Plan must be generated and saved first.");
    setLoadingBacktest(true);
    setBacktestResult(null);
    try {
      const res = await fetch(buildUrl(`api/features/backtest/evaluate/${plan.planId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Backtest failed");
      setBacktestResult(j);
    } catch (e) {
      console.error("Backtest error", e);
      alert(e.message || "Backtest failed");
    } finally {
      setLoadingBacktest(false);
    }
  };

  // ------------------ Moodboard ------------------
  const createMoodboard = async (q) => {
    try {
      const res = await fetch(buildUrl("api/features/moodboard"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: q || goal || "holiday" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Moodboard failed");
      setMoodboard(j);
      setShowMoodModal(true);
    } catch (e) {
      console.error("Moodboard error", e);
      alert(e.message || "Moodboard failed");
    }
  };

  // ------------------ Alerts (register + test) ------------------
  const registerAlert = async (symbol, threshold, type = "below") => {
    try {
      const res = await fetch(buildUrl("api/features/alerts/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ symbol, threshold, type }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Register failed");
      alert(`Alert registered (id ${j.alertId || "?"})`);
    } catch (e) {
      console.error("Register alert error", e);
      alert(e.message || "Failed to register alert");
    }
  };

  const testAlert = async (symbol, threshold, type = "below") => {
    try {
      const res = await fetch(buildUrl("api/features/alerts/test"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ symbol, threshold, type }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Test alert failed");
      // Browser notification (if permission granted)
      if (window.Notification && Notification.permission === "granted" && j.triggered) {
        new Notification(`${symbol} alert`, { body: `Triggered: current ${j.current}` });
      } else {
        alert(`Trigger: ${j.triggered} • current: ${j.current} • source: ${j.source}`);
      }
    } catch (e) {
      console.error("Test alert error", e);
      alert(e.message || "Test alert failed");
    }
  };

  // Request Notification permission on first use (non-blocking)
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // ------------------ Optimize quick (calls endpoint) ------------------
  const runOptimize = async () => {
    if (!plan) return alert("Generate plan first");
    try {
      const res = await fetch(buildUrl("api/features/optimize"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetAmount: plan.targetAmount, months: plan.months, riskLevel: plan.riskLevel }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Optimize failed");
      alert(`Suggested SIP: ₹${j.suggestedSIP}\nReason: ${j.reason}`);
    } catch (e) {
      console.error("Optimize error", e);
      alert(e.message || "Optimize failed");
    }
  };

  // ------------------ small sub-components (inline) ------------------
  function StockSparkline({ symbol }) {
    const closes = sparkCache[symbol] || [];
    if (!closes || closes.length === 0) return <div style={{ width: 100, height: 28, color: "#999" }}>—</div>;
    const data = {
      labels: closes.map((_, i) => i),
      datasets: [{ data: closes, fill: false, borderWidth: 1, pointRadius: 0 }],
    };
    const opts = {
      responsive: true,
      maintainAspectRatio: false,
      elements: { line: { tension: 0.3 } },
      scales: { x: { display: false }, y: { display: false } },
      plugins: { legend: { display: false } },
    };
    return <div style={{ width: 100, height: 28 }}><Line data={data} options={opts} /></div>;
  }

  function Heatmap() {
    if (loadingHeatmap) return <div className="text-center py-3">Loading heatmap…</div>;
    if (!heatmapData || heatmapData.length === 0) return <div className="text-muted">Heatmap unavailable</div>;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {heatmapData.map((d, i) => {
          let g = 0;
          try { g = parseFloat(String(d.growth || "0").replace("%", "")); } catch (e) {}
          const bg = g > 0 ? "#e9f7ee" : g < 0 ? "#fff5f6" : "#f3f3f3";
          return (
            <div key={i} style={{ padding: 12, borderRadius: 8, background: bg, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontWeight: 700 }}>{d.symbol}</div>
              <div style={{ fontSize: 18 }}>{typeof d.price === "number" ? `₹${Number(d.price).toLocaleString()}` : d.price}</div>
              <div className="small text-muted">{d.growth} • {d.source}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // ------------------ render
  return (
    <Container className="py-4">
      <h2 className="fw-bold text-primary mb-4">Dream-to-Investment Planner (AI)</h2>

      {/* Heatmap (quick view) */}
      <Card className="mb-3">
        <Card.Body>
          <Row className="align-items-center">
            <Col><h6 className="mb-0">Market Heatmap</h6></Col>
            <Col className="text-end">
              <Button size="sm" variant="outline-secondary" onClick={loadHeatmap}>Refresh</Button>
            </Col>
          </Row>
          <div className="mt-3"><Heatmap /></div>
        </Card.Body>
      </Card>

      {/* INPUT CARD */}
      <Card className="shadow-sm border-0 mb-3">
        <Card.Body>
          <Form onSubmit={handleGenerate}>
            <Form.Control
              type="text"
              placeholder='E.g. "Buy house"'
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />

            <Row className="g-3 mt-3">
              <Col md={4}>
                <Form.Control
                  type="number"
                  placeholder="Amount needed (₹)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Col>

              <Col md={4}>
                <Form.Control
                  type="number"
                  placeholder={durationUnit === "years" ? "Duration (years)" : "Duration (months)"}
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                  min="1"
                />
              </Col>

              <Col md={4}>
                <Form.Select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                >
                  <option value="years">Years</option>
                  <option value="months">Months</option>
                </Form.Select>
              </Col>
            </Row>

            <div className="d-flex gap-2 mt-3">
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? (<><Spinner animation="border" size="sm" className="me-2" />Generating…</>) : "Generate Plan"}
              </Button>

              <Button variant="outline-secondary" onClick={() => { setGoal(""); setAmount(""); setDurationValue(""); setPlan(null); setErr(""); }}>
                Reset
              </Button>

              <Button variant="secondary" onClick={loadHistory} disabled={loadingHist}>
                {loadingHist ? "Loading…" : "Load History"}
              </Button>

              <Button variant="outline-info" onClick={() => createMoodboard(goal || "holiday")}>
                Moodboard
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {err && <Alert variant="danger">{err}</Alert>}

      {/* PLAN RESULT */}
      {plan && (
        <>
          {/* SUMMARY */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body>
              <Row className="align-items-center mb-3">
                <Col>
                  <h4 className="fw-bold text-success mb-0">{plan.goal}</h4>
                  <div className="text-muted small">{plan.emoji} {plan.category}</div>
                </Col>
                <Col className="text-end">
                  {/* Probability badge */}
                  <div>
                    <Badge bg={plan.successScore >= 70 ? "success" : plan.successScore >= 40 ? "warning" : "danger"}>
                      {plan.successScore ?? 0}% chance
                    </Badge>
                    <div className="small text-muted mt-1">Projected ₹{fmt(plan.projectedValue)}</div>
                  </div>
                </Col>
              </Row>

              <Row className="g-4">
                <Col md={4}>
                  <Card className="shadow-sm text-white" style={{ background: "#007bff" }}>
                    <Card.Body>
                      <Card.Title>Target Amount</Card.Title>
                      <h3>₹{fmt(plan.targetAmount ?? plan.amount)}</h3>
                      <p>Timeline: {fmt(plan.months ?? plan.duration)} months</p>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={4}>
                  <Card className="shadow-sm text-white" style={{ background: "#17a2b8" }}>
                    <Card.Body>
                      <Card.Title>Your Balance</Card.Title>
                      <h3>₹{fmt(plan.currentBalance ?? plan.balance)}</h3>
                      <p>Shortfall: ₹{fmt(plan.shortfall)}</p>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={4}>
                  <Card className="shadow-sm text-white" style={{ background: "#28a745" }}>
                    <Card.Body>
                      <Card.Title>Monthly SIP</Card.Title>
                      <h3>₹{fmt(plan.sip)}</h3>
                      <p>{plan.shortfall === 0 ? "Goal achievable now" : "Required per month"}</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* PIE CHART + INSIGHT */}
          <Row className="g-4 mb-4">
            <Col md={6}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Allocation</Card.Title>
                  <div style={{ height: "300px" }}>
                    {pieData ? (<Pie data={pieData} options={{ maintainAspectRatio: false }} />) : (<div className="text-muted">No allocation available.</div>)}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>AI Insight</Card.Title>
                  <p style={{ whiteSpace: "pre-wrap" }}>{plan.goalProjection?.message || plan.insights?.[0] || "—"}</p>
                  <p className="text-muted small">Projected value: ₹{fmt(plan.projectedValue)} • Success score: {fmt(plan.successScore)}%</p>

                  <div className="d-flex gap-2 mt-2">
                    <Button variant="outline-primary" size="sm" onClick={runOptimize}>Auto-optimize</Button>
                    <Button variant="outline-secondary" size="sm" onClick={runBacktest} disabled={loadingBacktest}>
                      {loadingBacktest ? "Running…" : "Run Backtest"}
                    </Button>
                    <Button variant="outline-success" size="sm" onClick={() => createMoodboard(goal || "trip")}>Moodboard</Button>
                    <Button variant="outline-warning" size="sm" onClick={() => registerAlert(plan.stocks?.[0]?.symbol || "INFY.NS", plan.stocks?.[0]?.price || 0)}>Quick Alert</Button>
                  </div>

                  {/* dynamic suggestion cards */}
                  <Row className="g-2 mt-3">
                    {(plan.insights || []).slice(0,3).map((ins, i) => (
                      <Col md={4} key={i}>
                        <Card className="p-2">
                          <h6 style={{ marginBottom: 8 }}>Suggestion</h6>
                          <p style={{ fontSize: 13, marginBottom: 0 }}>{ins}</p>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* STOCKS */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body>
              <Card.Title>Recommended Stocks</Card.Title>
              <div className="table-responsive">
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Price (₹)</th>
                      <th>Growth</th>
                      <th>Spark</th>
                      <th>Bias</th>
                      <th>Expected (by target)</th>
                      <th>Suggestion</th>
                      <th>Monte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(plan.stocks || []).length === 0 && (
                      <tr><td colSpan="8" className="text-center text-muted">No stock data available</td></tr>
                    )}
                    {(plan.stocks || []).map((s, i) => {
                      const comment = plan.stockComments?.[i] || {};
                      const priceNum = typeof s.price === "number" ? s.price : parseFloat(s.price) || null;
                      const expected = comment.expectedPrice && comment.expectedPrice !== "N/A" ? Number(comment.expectedPrice) : null;
                      const delta = expected && priceNum ? Math.round(((expected - priceNum) / priceNum) * 100) : null;
                      return (
                        <tr key={i}>
                          <td>{s.symbol} <div className="small text-muted">{s.source ?? comment.source}</div></td>
                          <td>{priceNum ? `₹${fmt(priceNum)}` : s.price}</td>
                          <td>{s.growth}</td>
                          <td style={{ width: 110 }}><StockSparkline symbol={s.symbol} /></td>
                          <td style={{ width: 100 }}>
                            {delta !== null ? (
                              <Badge bg={delta >= 0 ? "success" : "danger"}>{delta >= 0 ? `Bullish +${delta}%` : `Bearish ${delta}%`}</Badge>
                            ) : (<Badge bg="secondary">No data</Badge>)}
                          </td>
                          <td>{expected ?? "—"}</td>
                          <td style={{ maxWidth: 360 }}>{comment.suggestion ?? s.suggestion ?? "—"}</td>
                          <td>
                            <Button size="sm" variant="outline-primary" onClick={() => runMonteCarlo(s.symbol, priceNum || s.price)} disabled={loadingMonte}>
                              {loadingMonte ? "…" : "Monte"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

              {/* Monte / Backtest results */}
              {monteResult && (
                <Card className="mt-3">
                  <Card.Body>
                    <h6>Monte Carlo: {monteResult.symbol}</h6>
                    <p className="small mb-1">Median: ₹{fmt(Math.round(monteResult.median))} • P90: ₹{fmt(Math.round(monteResult.p90))}</p>
                    <div style={{ maxHeight: 140, overflow: "auto" }}>
                      <div className="small text-muted">Sample values (first 20 shown):</div>
                      <div className="small">{(monteResult.samples || []).slice(0, 20).map((v, idx) => <span key={idx} style={{ marginRight: 8 }}>{Math.round(v)}</span>)}</div>
                    </div>
                  </Card.Body>
                </Card>
              )}

              {backtestResult && (
                <Card className="mt-3">
                  <Card.Body>
                    <h6>Backtest results (MAPE: {backtestResult.mape?.toFixed(2)}%)</h6>
                    <div style={{ maxHeight: 180, overflow: "auto" }}>
                      {(backtestResult.pairs || []).map((p, idx) => (
                        <div key={idx} className="small">
                          {p.date}: actual ₹{Math.round(p.actual)} vs forecast ₹{Math.round(p.forecast)}
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              )}
            </Card.Body>
          </Card>

          {/* MUTUAL FUNDS */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body>
              <Card.Title>Suggested Mutual Funds</Card.Title>
              <div className="table-responsive">
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Fund</th>
                      <th>NAV (₹)</th>
                      <th>CAGR</th>
                      <th>Source</th>
                      <th>Expected NAV</th>
                      <th>Suggestion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(plan.funds || []).length === 0 && (
                      <tr><td colSpan="6" className="text-center text-muted">No fund data available</td></tr>
                    )}
                    {(plan.funds || []).map((f, i) => {
                      const comment = plan.fundComments?.[i] || {};
                      const navNum = typeof f.nav === "number" ? f.nav : parseFloat(f.nav) || null;
                      return (
                        <tr key={i}>
                          <td>{f.name || f.scheme_name || f.code || "N/A"}</td>
                          <td>{navNum ? `₹${fmt(navNum)}` : f.nav}</td>
                          <td>{f.cagr ?? "Live"}</td>
                          <td>{f.source ?? comment.source ?? "N/A"}</td>
                          <td>{comment.expectedNav ?? "—"}</td>
                          <td style={{ maxWidth: 360 }}>{comment.suggestion ?? f.suggestion ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </>
      )}

      {/* HISTORY */}
      {(history.length > 0 || histErr) && (
        <Card className="shadow-sm border-0 my-4">
          <Card.Body>
            <Card.Title>Your Past Goal Plans</Card.Title>

            {histErr ? <Alert variant="warning">{histErr}</Alert> : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Goal</th>
                      <th>Target</th>
                      <th>Months</th>
                      <th>Balance</th>
                      <th>Shortfall</th>
                      <th>SIP</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h._id}>
                        <td>{new Date(h.createdAt).toLocaleString()}</td>
                        <td>{h.goal}</td>
                        <td>₹{fmt(h.targetAmount ?? h.amount)}</td>
                        <td>{fmt(h.months ?? h.duration)}</td>
                        <td>₹{fmt(h.currentBalance ?? h.balance)}</td>
                        <td>₹{fmt(h.shortfall)}</td>
                        <td>₹{fmt(h.sip)}</td>
                        <td>
                          <Button variant="danger" size="sm" onClick={() => deleteGoal(h._id)}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Moodboard modal */}
      <Modal show={showMoodModal} onHide={() => setShowMoodModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{moodboard?.headline ?? "Moodboard"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {moodboard ? (
            <>
              <Row>
                {(moodboard.images || []).map((img, idx) => (
                  <Col md={4} key={idx} className="mb-3">
                    <img src={img} alt="mood" style={{ width: "100%", borderRadius: 8 }} />
                  </Col>
                ))}
              </Row>
              <div className="mt-2"><strong>Estimated cost:</strong> ₹{fmt(moodboard.cost)} • <strong>Timeline:</strong> {moodboard.timelineMonths} months</div>
            </>
          ) : <div>Loading…</div>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMoodModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
