// backend/src/routes/stockRoutes.js
import express from "express";
import axios from "axios";

const router = express.Router();

// --- Simple in-memory cache with TTL (no external package) ---
const CACHE = {};
function cacheSet(key, value, ttlSeconds = 300) {
  CACHE[key] = { value, exp: Date.now() + ttlSeconds * 1000 };
}
function cacheGet(key) {
  const entry = CACHE[key];
  if (!entry) return null;
  if (Date.now() > entry.exp) {
    delete CACHE[key];
    return null;
  }
  return entry.value;
}

// --- helper: safe axios.get with retries minimal
async function safeGet(url, opts = {}) {
  try {
    const r = await axios.get(url, { timeout: 12000, ...opts });
    return r.data;
  } catch (err) {
    // bubble error message but don't throw HTML into response
    throw new Error(err?.response?.data?.error || err?.message || "Request failed");
  }
}

// ------------------ SEARCH (Yahoo quick) ------------------
router.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ results: [] });

  const cacheKey = `search:${q.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ results: cached });

  try {
    // Yahoo suggestion endpoint
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=20&newsCount=0`;
    const data = await safeGet(url);
    const quotes = (data?.quotes || []).map((it) => ({
      symbol: it.symbol,
      shortName: it.shortname || it.longname || it.shortName || it.displayName || "",
      name: it.longname || it.shortname || it.shortName || "",
      exchange: it.exchange || it.exchangeName || "",
      type: it.quoteType || "",
    }));
    cacheSet(cacheKey, quotes, 60); // short cache
    return res.json({ results: quotes });
  } catch (err) {
    console.error("[stocks/search] error:", err.message);
    return res.status(500).json({ error: "Search failed" });
  }
});

// ------------------ POPULAR (small lists) ------------------
router.get("/popular", (req, res) => {
  const seg = String(req.query.segment || "nifty").toLowerCase();
  const lists = {
    nifty: [
      { symbol: "RELIANCE.NS", name: "Reliance Industries" },
      { symbol: "TCS.NS", name: "TCS" },
      { symbol: "INFY.NS", name: "Infosys" },
      { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
    ],
    bank: [
      { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
      { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
      { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank" },
    ],
    it: [
      { symbol: "TCS.NS", name: "TCS" },
      { symbol: "INFY.NS", name: "Infosys" },
      { symbol: "WIPRO.NS", name: "Wipro" },
    ],
    crypto: [
      { symbol: "BTC-USD", name: "Bitcoin" },
      { symbol: "ETH-USD", name: "Ethereum" },
    ],
  };
  return res.json({ stocks: lists[seg] || lists.nifty });
});

// ------------------ SUMMARY (quick quote) ------------------
router.get("/summary/:symbol", async (req, res) => {
  const symbol = String(req.params.symbol || "").trim();
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const cacheKey = `summary:${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    // Use yahoo chart meta (small request)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
    const data = await safeGet(url);
    const meta = data?.chart?.result?.[0]?.meta || {};
    const summary = {
      symbol,
      currency: meta?.currency || "INR",
      exchange: meta?.exchangeName || meta?.exchange || "",
      marketPrice: meta?.regularMarketPrice ?? null,
      marketChange: meta?.regularMarketChange ?? null,
      marketChangePercent: meta?.regularMarketChangePercent ?? null,
      dayHigh: meta?.chartPreviousClose ?? null, // fallback
      dayLow: meta?.chartPreviousClose ?? null,
      open: meta?.chartPreviousClose ?? null,
      previousClose: meta?.previousClose ?? null,
    };
    cacheSet(cacheKey, summary, 10);
    return res.json(summary);
  } catch (err) {
    console.error("[stocks/summary] error:", err.message);
    return res.status(500).json({ error: "Could not fetch summary" });
  }
});

// ------------------ HISTORY (OHLC series) ------------------
router.get("/history/:symbol", async (req, res) => {
  const symbol = String(req.params.symbol || "").trim();
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  // range e.g. 1d,5d,1mo,6mo,1y,2y ; interval e.g. 1m,5m,15m,60m,1d
  const range = String(req.query.range || "1y");
  const interval = String(req.query.interval || "1d");

  const cacheKey = `history:${symbol}:${range}:${interval}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
    const data = await safeGet(url);
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(500).json({ error: "No data returned" });

    const timestamps = result.timestamp || [];
    const indicators = result.indicators || {};
    const quote = indicators.quote?.[0] || {};
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];
    const volumes = quote.volume || [];

    // Create series array for charts: each item { time, open, high, low, close, volume }
    const series = [];
    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      const close = closes[i];
      if (close == null) continue; // skip missing
      // For intraday (interval like 1m/5m/15m/60m) use unix seconds (number)
      // For daily, use YYYY-MM-DD string
      const isIntraday = String(interval).endsWith("m") || interval === "60m";
      const time = isIntraday ? Math.floor(ts) : new Date(ts * 1000).toISOString().slice(0, 10);
      series.push({
        time,
        open: opens[i] == null ? close : Number(opens[i]),
        high: highs[i] == null ? close : Number(highs[i]),
        low: lows[i] == null ? close : Number(lows[i]),
        close: Number(close),
        volume: volumes[i] == null ? 0 : Number(volumes[i]),
      });
    }

    const out = { symbol, range, interval, series };
    cacheSet(cacheKey, out, 60); // cache 60s
    return res.json(out);
  } catch (err) {
    console.error("[stocks/history] error:", err.message);
    return res.status(500).json({ error: "Could not fetch history" });
  }
});

// ------------------ PREDICT (stub / simple linear drift) ------------------
router.get("/predict/:symbol", async (req, res) => {
  // horizon days
  const symbol = String(req.params.symbol || "").trim();
  const horizon = Number(req.query.horizon || 90);

  if (!symbol) return res.status(400).json({ error: "symbol required" });
  if (!Number.isFinite(horizon) || horizon <= 0) return res.status(400).json({ error: "invalid horizon" });

  try {
    // get recent daily history to compute simple forecast
    const historyResp = await safeGet(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`);
    const result = historyResp?.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const closes = (result?.indicators?.quote?.[0]?.close) || [];

    if (!timestamps.length || !closes.length) {
      return res.status(500).json({ error: "No data found" });
    }

    // compute simple daily trend using last 30 days (linear growth)
    const len = Math.min(30, closes.length);
    const recent = closes.slice(-len);
    const avgDailyChange = recent.slice(1).reduce((s, v, i) => s + (v - recent[i]), 0) / Math.max(1, recent.length - 1);

    // start from last close
    const lastClose = Number(recent[recent.length - 1]);
    const months = horizon; // treat horizon as days for simplicity
    const forecastPrices = [];
    const monthsLabels = [];
    for (let i = 1; i <= horizon; i++) {
      const next = lastClose + avgDailyChange * i;
      forecastPrices.push(Math.round(next * 100) / 100);
      // label as date (YYYY-MM-DD)
      const d = new Date((timestamps[timestamps.length - 1] * 1000) + i * 24 * 3600 * 1000);
      monthsLabels.push(d.toISOString().slice(0, 10));
    }

    const out = {
      symbol,
      horizon,
      model: "linear-drift-stub",
      prices: forecastPrices,
      months: monthsLabels,
      note: "Simple heuristic forecast — replace with model call if you have one",
    };
    return res.json(out);
  } catch (err) {
    console.error("[stocks/predict] error:", err.message);
    return res.status(500).json({ error: "No data found" });
  }
});

// ------------------ INSIGHTS (basic analytics) ------------------
router.get("/insights/:symbol", async (req, res) => {
  const symbol = String(req.params.symbol || "").trim();
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  try {
    // fetch 1y daily history
    const hist = await safeGet(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`);
    const result = hist?.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const closes = (result?.indicators?.quote?.[0]?.close) || [];

    if (!closes.length) return res.status(500).json({ error: "No data found" });

    // compute daily returns
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      const r = (closes[i] - closes[i - 1]) / Math.max(1e-9, closes[i - 1]);
      returns.push(r);
    }
    const mean = returns.reduce((s, v) => s + v, 0) / Math.max(1, returns.length);
    const variance = returns.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(1, returns.length);
    const std = Math.sqrt(variance);
    const annualReturn = mean * 252 * 100;
    const annualVol = std * Math.sqrt(252) * 100;

    // simple risk label
    const riskScore = Math.max(0, Math.min(100, Math.round((annualVol > 40 ? 80 : annualVol > 25 ? 60 : annualVol > 15 ? 40 : 20))));

    const label = annualReturn > 10 ? "Growth" : annualReturn > 0 ? "Stable" : "Defensive";

    return res.json({
      symbol,
      annualReturn: Math.round(annualReturn * 100) / 100,
      annualVolatility: Math.round(annualVol * 100) / 100,
      riskScore,
      label,
    });
  } catch (err) {
    console.error("[stocks/insights] error:", err.message);
    return res.status(500).json({ error: "Could not compute insights" });
  }
});

export default router;
