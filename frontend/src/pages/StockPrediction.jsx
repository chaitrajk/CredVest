// frontend/src/pages/StockPrediction.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Badge,
  Tabs,
  Tab,
  Spinner,
  Dropdown,
} from "react-bootstrap";

import { Line, Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

ChartJS.register(
  LineElement,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title
);

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// load TradingView sdk script
const loadTradingViewScript = () =>
  new Promise((resolve) => {
    if (document.getElementById("tradingview-widget-script")) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.id = "tradingview-widget-script";
    s.src = "https://s3.tradingview.com/tv.js";
    s.onload = resolve;
    s.onerror = () => {
      // script failed, still resolve to avoid hanging
      resolve();
    };
    document.body.appendChild(s);
  });

export default function StockPrediction() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState(null); // raw backend response
  const [normHistory, setNormHistory] = useState(null); // normalized { dates:[], prices:[] }
  const [prediction, setPrediction] = useState(null);
  const [insights, setInsights] = useState(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [popular, setPopular] = useState([]);
  const [exchangeFilter, setExchangeFilter] = useState("ALL"); // ALL / NSE / BSE / GLOBAL
  const [capFilter, setCapFilter] = useState("ALL"); // ALL / LARGE / MID / SMALL
  const [predHorizon, setPredHorizon] = useState(90);
  const [showTV, setShowTV] = useState(false);

  // watchlist state (persisted)
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const raw = localStorage.getItem("cv_watchlist");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const tvContainerRef = useRef(null); // will point to inner mounting div
  const tvWidgetRef = useRef(null);
  const token = localStorage.getItem("token");

  // ---------------- analytics helpers (enhanced insights) ----------------
  function computeReturnsFromPrices(prices) {
    if (!prices || prices.length < 2) return null;
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const r = (prices[i] - prices[i - 1]) / Math.max(1e-9, prices[i - 1]);
      returns.push(r);
    }
    return returns;
  }

  function computeCAGR(prices, daysPerYear = 252) {
    if (!prices || prices.length < 2) return null;
    const start = prices[0];
    const end = prices[prices.length - 1];
    const years = Math.max(1 / daysPerYear, prices.length / daysPerYear);
    try {
      return Math.pow(end / start, 1 / years) - 1;
    } catch {
      return null;
    }
  }

  function computeAnnualVolatility(returns, daysPerYear = 252) {
    if (!returns || returns.length < 2) return null;
    const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
    const variance = returns.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(1, returns.length - 1);
    return Math.sqrt(variance) * Math.sqrt(daysPerYear);
  }

  function computeMaxDrawdown(prices) {
    if (!prices || prices.length < 2) return null;
    let peak = prices[0];
    let maxDD = 0;
    for (const p of prices) {
      if (p > peak) peak = p;
      const dd = (peak - p) / peak;
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
  }

  function sma(values, window) {
    if (!values || values.length === 0) return [];
    const out = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = values.slice(start, i + 1);
      const mean = slice.reduce((s, v) => s + v, 0) / slice.length;
      out.push(mean);
    }
    return out;
  }

  function fmtPercent(v, digits = 2) {
    if (v == null || Number.isNaN(v)) return "-";
    return `${(v * 100).toFixed(digits)}%`;
  }
  function fmtSignedPercent(v, digits = 2) {
    if (v == null || Number.isNaN(v)) return "-";
    return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(digits)}%`;
  }

  // Narrative generator (rule-based)
  function generateNarrative({ symbol, summary, normHistory, insights, prediction }) {
    if (!normHistory || !normHistory.prices || normHistory.prices.length < 10) {
      return null;
    }

    const prices = normHistory.prices;
    const returns = computeReturnsFromPrices(prices);
    const cagr = computeCAGR(prices);
    const annVol = computeAnnualVolatility(returns);
    const maxDD = computeMaxDrawdown(prices);
    const last30 = prices.slice(-30);
    const momentum30 = (last30[last30.length - 1] - last30[0]) / Math.max(1e-9, last30[0]);

    const trend = momentum30 > 0.02 ? "uptrend" : momentum30 < -0.02 ? "downtrend" : "range-bound";
    const riskLabel = annVol > 0.6 ? "very high" : annVol > 0.3 ? "high" : annVol > 0.15 ? "moderate" : "low";

    const modelHint = prediction?.model ? ` The forecast was produced by the ${prediction.model} model.` : "";

    const text = [
      `Over the observed period, ${symbol} shows a ${trend} with a 30-day momentum of ${fmtSignedPercent(momentum30)}.`,
      `Estimated compound annual growth (CAGR) is ${fmtSignedPercent(cagr)}, with annualized volatility around ${fmtPercent(annVol)} and a historic max drawdown of ${fmtPercent(maxDD)}.`,
      `This implies a ${riskLabel} volatility profile.${modelHint}`,
    ].join(" ");

    let suggestion = "No specific action — align with your risk profile.";
    if (cagr != null && cagr > 0.15 && annVol < 0.4) suggestion = "Attractive growth with controlled volatility — consider a measured buy or accumulation strategy.";
    else if (cagr != null && cagr > 0 && annVol > 0.5) suggestion = "Positive trend but high volatility — consider smaller position sizing or hedging.";
    else if (cagr != null && cagr <= 0 && momentum30 < 0) suggestion = "Momentum is negative and returns are flat/negative — consider avoiding new positions or use stop-loss.";

    return { text, suggestion, stats: { cagr, annVol, maxDD, momentum30 } };
  }
  // ---------------------------------------------------------------------

  const tvContainerId = "tradingview_chart";

  // Only include Authorization header if token exists (prevents "Bearer null")
  const getAxiosCfg = () => {
    const cfg = {};
    if (token) cfg.headers = { Authorization: `Bearer ${token}` };
    return cfg;
  };

  // Search
  useEffect(() => {
    const run = async () => {
      if (!query || query.length < 1) {
        setSearchResults([]);
        return;
      }
      try {
        const r = await axios.get(
          `${API}/api/stocks/search?q=${encodeURIComponent(query)}`,
          getAxiosCfg()
        );
        setSearchResults(r.data.results || []);
      } catch (e) {
        console.error("Search error", e);
      }
    };
    const id = setTimeout(run, 300); // debounce
    return () => clearTimeout(id);
  }, [query]);

  // Popular loader function
  const loadPopular = async (segment) => {
    try {
      const r = await axios.get(
        `${API}/api/stocks/popular?segment=${segment}`,
        getAxiosCfg()
      );
      setPopular(r.data.stocks || []);
    } catch (e) {
      console.error("popular failed", e);
    }
  };

  useEffect(() => {
    loadPopular("nifty");
  }, []);

  // Normalize history returned by backend into { dates[], prices[] }
  function normalizeHistory(raw) {
    if (!raw) return null;
    // If backend gave { dates: [], prices: [] } already
    if (Array.isArray(raw.dates) && Array.isArray(raw.prices)) {
      return { dates: raw.dates, prices: raw.prices };
    }
    // If backend gave { series: [{ time, open, high, low, close, volume }, ...] }
    if (Array.isArray(raw.series)) {
      const dates = [];
      const prices = [];
      for (const s of raw.series) {
        // For daily series time might be "YYYY-MM-DD" or unix secs (number)
        if (typeof s.time === "number") {
          dates.push(new Date(s.time * 1000).toISOString().slice(0, 10));
        } else {
          dates.push(String(s.time));
        }
        prices.push(Number(s.close));
      }
      return { dates, prices };
    }
    // Unknown shape: try to find arrays
    const maybeDates = raw?.dates || raw?.x || raw?.labels;
    const maybePrices = raw?.prices || raw?.y || raw?.values;
    if (Array.isArray(maybeDates) && Array.isArray(maybePrices)) {
      return { dates: maybeDates, prices: maybePrices };
    }
    // can't normalize
    return null;
  }

  // Main loader
  const loadAllForSymbol = async (symbol, name) => {
    if (!symbol) return;
    setErr("");
    setLoading(true);
    setSelectedSymbol(symbol);
    setSelectedName(name || symbol);
    setPrediction(null);
    setInsights(null);
    setSummary(null);
    setHistory(null);
    setNormHistory(null);

    try {
      // include horizon query param for predict
      const sumP = axios.get(`${API}/api/stocks/summary/${symbol}`, getAxiosCfg());
      const histP = axios.get(`${API}/api/stocks/history/${symbol}`, getAxiosCfg());
      const predP = axios.get(
        `${API}/api/stocks/predict/${symbol}?horizon=${predHorizon}`,
        getAxiosCfg()
      );
      const insP = axios.get(`${API}/api/stocks/insights/${symbol}`, getAxiosCfg());

      const [sum, hist, pred, ins] = await Promise.all([sumP, histP, predP, insP]);

      setSummary(sum.data);
      setHistory(hist.data);
      const nh = normalizeHistory(hist.data);
      setNormHistory(nh);
      setPrediction(pred.data);
      setInsights(ins.data);
      setErr("");
      setActiveTab("overview");
    } catch (e) {
      console.error("Load failed", e);
      setErr(
        e?.response?.data?.error ||
          e?.message ||
          "Failed to load stock data. Try another symbol."
      );
    } finally {
      setLoading(false);
    }
  };

  // Watchlist helpers
  const isWatched = (sym) => watchlist.includes(sym);
  const toggleWatch = (sym, name) => {
    if (!sym) return;
    setWatchlist((prev) => {
      if (prev.includes(sym)) return prev.filter((s) => s !== sym);
      // prepend so recent shows first
      return [sym, ...prev];
    });
    if (!isWatched(sym)) {
      if (name) setSelectedName(name);
    }
  };

  const loadFromWatch = (sym) => {
    const found = (popular || []).find((p) => p.symbol === sym);
    loadAllForSymbol(sym, found ? found.name : sym);
  };

  // persist watchlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("cv_watchlist", JSON.stringify(watchlist));
    } catch (e) {
      console.warn("Could not save watchlist", e);
    }
  }, [watchlist]);

  // ------------------ FIXED TradingView mount effect ------------------
  useEffect(() => {
    let mounted = true;

    async function tryMount() {
      if (!selectedSymbol || !showTV) return;

      await loadTradingViewScript();
      if (!mounted) return;

      if (!window.TradingView) {
        console.warn("TradingView library failed to load (tv.js missing). Check network/CSP.");
        return;
      }

      const container = tvContainerRef.current;
      if (!container) {
        console.warn("tv container ref not available");
        return;
      }

      // Clear previous TradingView content inside the inner div (safe — React owns the div)
      try {
        container.innerHTML = "";
      } catch (e) {
        // ignore
      }

      // Normalize some common symbol formats to TradingView-friendly strings
      const normalizeForTV = (sym) => {
        if (!sym) return sym;
        const s = String(sym).trim();
        if (s.endsWith(".NS")) return `NSE:${s.replace(".NS", "")}`;
        if (s.endsWith(".BO")) return `BSE:${s.replace(".BO", "")}`;
        if (/^[A-Z0-9]{2,8}-USD$/i.test(s)) return `BINANCE:${s.replace("-", "")}`;
        if (s.includes(":")) return s;
        return s;
      };

      const tvSymbol = normalizeForTV(selectedSymbol);

      try {
        tvWidgetRef.current = new window.TradingView.widget({
          autosize: true,
          width: "100%",
          height: 520,
          symbol: tvSymbol,
          interval: "D",
          timezone: "Etc/UTC",
          theme: "light",
          style: "1",
          locale: "en",
          hide_side_toolbar: false,
          allow_symbol_change: false,
          container_id: container.id || tvContainerId,
        });
        console.info("TradingView widget created for", tvSymbol);
      } catch (err) {
        console.warn("TradingView mount failed:", err && err.message ? err.message : err);
      }
    }

    tryMount();

    return () => {
      mounted = false;
      try {
        const container = tvContainerRef.current;
        if (container) container.innerHTML = "";
        tvWidgetRef.current = null;
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, [selectedSymbol, showTV]);
  // --------------------------------------------------------------------

  // Chart data (safe checks)
  const historyChartData =
    normHistory && Array.isArray(normHistory.dates) && Array.isArray(normHistory.prices)
      ? {
          labels: normHistory.dates,
          datasets: [
            {
              label: "Close Price",
              data: normHistory.prices,
              borderColor: "#0d6efd",
              tension: 0.2,
              pointRadius: 0,
            },
          ],
        }
      : null;

  // Chart options with tooltip showing price/time
  const commonLineOptions = {
    responsive: true,
    plugins: {
      legend: { display: true, position: "top" },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: function (context) {
            const v = context.parsed.y;
            return `Price: ${typeof v === "number" ? v.toLocaleString() : v}`;
          },
          title: function (ctx) {
            const label = ctx[0]?.label;
            return `Date: ${label}`;
          },
        },
      },
      title: {
        display: true,
        text: "Price",
      },
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
    scales: {
      x: {
        display: true,
      },
      y: {
        display: true,
        ticks: {
          callback: (v) => (typeof v === "number" ? v.toLocaleString() : v),
        },
      },
    },
  };

  // Combined prediction chart (safe)
  const combinedPredictionData =
    normHistory &&
    normHistory.dates &&
    normHistory.prices &&
    prediction &&
    Array.isArray(prediction.prices) &&
    (Array.isArray(prediction.months) || Array.isArray(prediction.dates))
      ? (() => {
          const histDates = normHistory.dates;
          const histPrices = normHistory.prices;
          const predMonths = Array.isArray(prediction.months) ? prediction.months : prediction.dates || [];
          const predPrices = prediction.prices || [];
          // Use last N history points (60) and then prediction
          const lastN = Math.min(60, histPrices.length);
          const historySlice = histPrices.slice(-lastN);
          const historyLabels = histDates.slice(-lastN);
          // For combined labels we concat
          const combinedLabels = [...historyLabels, ...predMonths];
          const forecastData = [...new Array(historySlice.length).fill(null), ...predPrices];
          return {
            labels: combinedLabels,
            datasets: [
              {
                label: "History (Close)",
                data: [...new Array(Math.max(0, combinedLabels.length - predPrices.length - historySlice.length)).fill(null), ...historySlice],
                borderColor: "#0d6efd",
                tension: 0.2,
                pointRadius: 0,
              },
              {
                label: "Forecast",
                data: forecastData,
                borderColor: "#ffc107",
                borderDash: [5, 5],
                tension: 0.2,
                pointRadius: 0,
              },
            ],
          };
        })()
      : null;

  const riskPieData = insights
    ? {
        labels: ["Risk Score", "Remaining"],
        datasets: [
          {
            data: [insights.riskScore || 0, 100 - (insights.riskScore || 0)],
            backgroundColor: ["#dc3545", "#e9ecef"],
          },
        ],
      }
    : null;

  const perfBarData =
    insights &&
    prediction && {
      labels: ["Annual Return %", "Annual Volatility %"],
      datasets: [
        {
          data: [insights.annualReturn || 0, insights.annualVolatility || 0],
          backgroundColor: ["#198754", "#dc3545"],
        },
      ],
    };

  const fmtNum = (v, digits = 2) =>
    typeof v === "number" ? v.toLocaleString("en-IN", { maximumFractionDigits: digits }) : "-";

  const fmtPct = (v) => (typeof v === "number" ? `${v.toFixed(2)} %` : "-");

  const openInTradingView = () => {
    if (!selectedSymbol) return;
    const urlSymbol = selectedSymbol.replace(".", "-").replace("/", "-");
    const url = `https://www.tradingview.com/symbols/${urlSymbol}/`;
    window.open(url, "_blank");
  };

  return (
    <Container fluid className="py-3" style={{ maxWidth: 1280, paddingTop: "72px" }}>
      <h2 className="fw-bold text-primary mb-3">📈 Live Stock & Crypto Intelligence</h2>

      <Row className="mb-3">
        <Col md={8}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Form.Label className="fw-semibold">Search</Form.Label>
              <div className="d-flex gap-2" style={{ position: "relative" }}>
                <Form.Control
                  type="text"
                  placeholder="Ex: RELIANCE.NS, TCS.NS, BTC-USD"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />

                <Dropdown onSelect={(k) => setExchangeFilter(k)}>
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    Exchange: {exchangeFilter}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item eventKey="ALL">ALL</Dropdown.Item>
                    <Dropdown.Item eventKey="NSE">NSE</Dropdown.Item>
                    <Dropdown.Item eventKey="BSE">BSE</Dropdown.Item>
                    <Dropdown.Item eventKey="GLOBAL">GLOBAL</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>

                <Dropdown onSelect={(k) => setCapFilter(k)}>
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    Cap: {capFilter}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item eventKey="ALL">ALL</Dropdown.Item>
                    <Dropdown.Item eventKey="LARGE">Large Cap</Dropdown.Item>
                    <Dropdown.Item eventKey="MID">Mid Cap</Dropdown.Item>
                    <Dropdown.Item eventKey="SMALL">Small Cap</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              {searchResults.length > 0 && (
                <div
                  className="border rounded mt-1 bg-white"
                  style={{
                    maxHeight: 280,
                    overflowY: "auto",
                    position: "absolute",
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    width: "100%",
                  }}
                >
                  {searchResults.map((s) => {
                    if (exchangeFilter !== "ALL" && !String(s.exchange || "").toUpperCase().includes(exchangeFilter)) {
                      return null;
                    }
                    return (
                      <div
                        key={s.symbol}
                        className="px-2 py-1"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          setQuery(`${s.symbol} – ${s.shortName}`);
                          setSearchResults([]);
                          loadAllForSymbol(s.symbol, s.shortName);
                        }}
                      >
                        <strong>{s.symbol}</strong>{" "}
                        <span className="text-muted">
                          {s.shortName} • {s.exchange}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="d-flex gap-2 flex-wrap mt-3">
                <Badge bg="light" text="dark" onClick={() => loadPopular("nifty")}>
                  NIFTY
                </Badge>
                <Badge bg="light" text="dark" onClick={() => loadPopular("bank")}>
                  Banking
                </Badge>
                <Badge bg="light" text="dark" onClick={() => loadPopular("it")}>
                  IT
                </Badge>
                <Badge bg="light" text="dark" onClick={() => loadPopular("crypto")}>
                  Crypto
                </Badge>
              </div>

              {popular.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-3">
                  {popular.map((p) => (
                    <Button
                      size="sm"
                      variant="outline-primary"
                      key={p.symbol}
                      onClick={() => {
                        setQuery(`${p.symbol} – ${p.name}`);
                        loadAllForSymbol(p.symbol, p.name);
                      }}
                    >
                      {p.symbol} • {p.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* WATCHLIST PANEL (under search) */}
              <div className="mt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Watchlist</strong>
                  <small className="text-muted">{watchlist.length} items</small>
                </div>

                {watchlist.length === 0 ? (
                  <div className="text-muted small">No symbols saved. Click the star to add.</div>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {watchlist.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={s === selectedSymbol ? "primary" : "outline-secondary"}
                        onClick={() => loadFromWatch(s)}
                        title={`Open ${s}`}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <h6 className="fw-semibold mb-2">Current Selection</h6>

              {selectedSymbol ? (
                <>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong className="d-block">{selectedSymbol}</strong>
                      <span className="text-muted">{selectedName}</span>
                    </div>

                    {/* Watch toggle */}
                    <div>
                      <Button
                        size="sm"
                        variant={isWatched(selectedSymbol) ? "warning" : "outline-secondary"}
                        onClick={() => toggleWatch(selectedSymbol, selectedName)}
                        title={isWatched(selectedSymbol) ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        {isWatched(selectedSymbol) ? "★ Saved" : "☆ Save"}
                      </Button>
                    </div>
                  </div>

                  {summary ? (
                    <>
                      <h4 className="mt-2">
                        {fmtNum(summary.marketPrice)} <small>{summary.currency}</small>
                      </h4>
                      <p className={summary.marketChangePercent >= 0 ? "text-success" : "text-danger"}>
                        {summary.marketChangePercent >= 0 ? "▲" : "▼"} {fmtNum(summary.marketChange)} (
                        {fmtPct(summary.marketChangePercent)})
                      </p>
                    </>
                  ) : (
                    <p className="text-muted">Loading price…</p>
                  )}

                  <div className="d-flex gap-2 align-items-center mt-3">
                    <Form.Select
                      size="sm"
                      value={predHorizon}
                      onChange={(e) => setPredHorizon(Number(e.target.value))}
                      style={{ width: 160 }}
                    >
                      <option value={30}>Predict 30 day</option>
                      <option value={60}>Predict 60 day</option>
                      <option value={90}>Predict 90 day</option>
                      <option value={180}>Predict 180 day</option>
                    </Form.Select>

                    <Button
                      size="sm"
                      onClick={() => {
                        if (!selectedSymbol) return;
                        loadAllForSymbol(selectedSymbol, selectedName);
                      }}
                    >
                      Reload
                    </Button>

                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => {
                        setShowTV((s) => !s);
                      }}
                    >
                      {showTV ? "Hide Live" : "Show Live"}
                    </Button>

                    <Button size="sm" variant="outline-primary" onClick={openInTradingView}>
                      Open on TradingView
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-muted">Search a symbol…</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {err && <div className="alert alert-danger py-2">{err}</div>}
      {loading && (
        <div className="d-flex justify-content-center mb-3">
          <Spinner animation="border" size="sm" className="me-2" /> Loading…
        </div>
      )}

      {selectedSymbol && (
        <Card className="shadow-sm border-0">
          <Card.Body>
            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
              <Tab eventKey="overview" title="Overview">
                <Row className="mt-3">
                  <Col md={3}>
                    <Card className="bg-light border-0">
                      <Card.Body>
                        <small className="text-muted">Day Range</small>
                        <div>
                          {fmtNum(summary?.dayLow)} – {fmtNum(summary?.dayHigh)}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={3}>
                    <Card className="bg-light border-0">
                      <Card.Body>
                        <small className="text-muted">52W Range</small>
                        <div>
                          {fmtNum(summary?.fiftyTwoWeekLow)} – {fmtNum(summary?.fiftyTwoWeekHigh)}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={3}>
                    <Card className="bg-light border-0">
                      <Card.Body>
                        <small className="text-muted">Volume</small>
                        <div>{fmtNum(summary?.volume, 0)}</div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={3}>
                    <Card className="bg-light border-0">
                      <Card.Body>
                        <small className="text-muted">Exchange</small>
                        <div>{summary?.exchange}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab>

              <Tab eventKey="live" title="Live Chart">
                <div className="mt-3">
                  {showTV ? (
                    <div id={tvContainerId} ref={tvContainerRef} style={{ width: "100%", height: 520 }} />
                  ) : (
                    <p className="text-muted">Click "Show Live" to mount TradingView widget (uses remote socket)</p>
                  )}
                </div>
              </Tab>

              <Tab eventKey="history" title="History">
                <div className="mt-3">
                  {historyChartData ? (
                    <Line data={historyChartData} options={commonLineOptions} />
                  ) : (
                    <p className="text-muted">No history available.</p>
                  )}
                </div>
              </Tab>

              <Tab eventKey="prediction" title="Predictions">
                <div className="mt-3">
                  {combinedPredictionData ? (
                    <Line data={combinedPredictionData} options={commonLineOptions} />
                  ) : (
                    <p className="text-muted">Prediction not available.</p>
                  )}
                  {prediction && <p className="text-muted small mt-2">Model: {prediction.model}</p>}
                </div>
              </Tab>

              {/* ---------------- ENHANCED INSIGHTS TAB ---------------- */}
              <Tab eventKey="insights" title="Insights">
                <div className="mt-3">
                  {(() => {
                    const prices = normHistory?.prices || null;
                    const returns = prices ? computeReturnsFromPrices(prices) : null;
                    const cagr = prices ? computeCAGR(prices) : null;
                    const annVol = returns ? computeAnnualVolatility(returns) : null;
                    const maxDD = prices ? computeMaxDrawdown(prices) : null;
                    const sma20 = prices ? sma(prices, 20) : null;
                    const sma50 = prices ? sma(prices, 50) : null;
                    const lastPrice = prices ? prices[prices.length - 1] : null;
                    const distSMA20 = lastPrice && sma20 ? (lastPrice - sma20[sma20.length - 1]) / Math.max(1e-9, sma20[sma20.length - 1]) : null;
                    const distSMA50 = lastPrice && sma50 ? (lastPrice - sma50[sma50.length - 1]) / Math.max(1e-9, sma50[sma50.length - 1]) : null;
                    const narrative = generateNarrative({ symbol: selectedSymbol, summary, normHistory, insights, prediction });

                    return (
                      <>
                        <Row className="g-3">
                          <Col md={3}>
                            <Card>
                              <Card.Header className="bg-light fw-semibold">CAGR</Card.Header>
                              <Card.Body>
                                <h5>{fmtSignedPercent(cagr)}</h5>
                                <div className="small text-muted">Compound annual growth</div>
                              </Card.Body>
                            </Card>
                          </Col>

                          <Col md={3}>
                            <Card>
                              <Card.Header className="bg-light fw-semibold">Ann. Volatility</Card.Header>
                              <Card.Body>
                                <h5>{fmtPercent(annVol)}</h5>
                                <div className="small text-muted">Annualized σ</div>
                              </Card.Body>
                            </Card>
                          </Col>

                          <Col md={3}>
                            <Card>
                              <Card.Header className="bg-light fw-semibold">Max Drawdown</Card.Header>
                              <Card.Body>
                                <h5>{fmtPercent(maxDD)}</h5>
                                <div className="small text-muted">Largest peak→trough loss</div>
                              </Card.Body>
                            </Card>
                          </Col>

                          <Col md={3}>
                            <Card>
                              <Card.Header className="bg-light fw-semibold">30d Momentum</Card.Header>
                              <Card.Body>
                                <h5>{fmtSignedPercent(narrative?.stats?.momentum30)}</h5>
                                <div className="small text-muted">Recent momentum (30 days)</div>
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>

                        <Row className="mt-3 g-3">
                          <Col md={4}>
                            <Card>
                              <Card.Header className="bg-light fw-semibold">SMA Distances</Card.Header>
                              <Card.Body>
                                <div><strong>SMA20:</strong> {distSMA20 != null ? fmtSignedPercent(distSMA20) : "-"}</div>
                                <div><strong>SMA50:</strong> {distSMA50 != null ? fmtSignedPercent(distSMA50) : "-"}</div>
                                <div className="small text-muted mt-2">Positive means price is above the moving average.</div>
                              </Card.Body>
                            </Card>
                          </Col>

                          <Col md={4}>
                            <Card>
                              <Card.Header className="bg-light fw-semibold">Model Forecast</Card.Header>
                              <Card.Body>
                                {prediction ? (
                                  <>
                                    <div className="mb-1 small text-muted">Model</div>
                                    <div><strong>{prediction.model || "model"}</strong></div>
                                    <div className="small text-muted mt-2">{prediction.note || ""}</div>
                                  </>
                                ) : (
                                  <div className="text-muted">No forecast available.</div>
                                )}
                              </Card.Body>
                            </Card>
                          </Col>

                          <Col md={4}>
                            <Card>
                              <Card.Header className="bg-light fw-semibold">AI Summary</Card.Header>
                              <Card.Body>
                                {narrative ? (
                                  <>
                                    <p style={{ lineHeight: 1.4 }}>{narrative.text}</p>
                                    <div className="mt-2">
                                      <strong>Suggestion:</strong> {narrative.suggestion}
                                    </div>
                                    <div className="text-muted small mt-2">Note: this is a rule-based summary; combine with your research.</div>
                                  </>
                                ) : (
                                  <p className="text-muted">Insufficient history to generate summary.</p>
                                )}
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>

                        <Row className="mt-3">
                          <Col>
                            <Card>
                              <Card.Body className="small text-muted">
                                <div><strong>Backend insight:</strong> {insights?.label || "—"}</div>
                                <div><strong>Annual Return:</strong> {insights?.annualReturn != null ? `${insights.annualReturn}%` : "—"}</div>
                                <div><strong>Annual Volatility:</strong> {insights?.annualVolatility != null ? `${insights.annualVolatility}%` : "—"}</div>
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>
                      </>
                    );
                  })()}
                </div>
              </Tab>
              {/* ---------------- end Insights ---------------- */}
            </Tabs>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
