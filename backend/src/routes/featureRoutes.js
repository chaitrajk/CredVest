// backend/src/routes/featureRoutes.js
import express from "express";
import axios from "axios";
import NodeCache from "node-cache";
import GoalPlanModel from "../models/GoalPlan.js";
import auth from "../middleware/auth.js";

// import the shared fetch helpers exported from goalPlanRoutes.js
import { fetchStock, fetchFund } from "./goalPlanRoutes.js";

const GoalPlan = GoalPlanModel?.default ?? GoalPlanModel;
const router = express.Router();
const cache = new NodeCache({ stdTTL: 300 });

// ----------------- Helpers -----------------
function randn_bm() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function monteCarloSim(startPrice, mu = 0.10, sigma = 0.25, months = 12, sims = 1000) {
  const dt = 1 / 12;
  const results = [];
  for (let s = 0; s < sims; s++) {
    let p = startPrice;
    for (let m = 0; m < months; m++) {
      const eps = randn_bm();
      const drift = (mu - 0.5 * sigma * sigma) * dt;
      const diffusion = sigma * Math.sqrt(dt) * eps;
      p = p * Math.exp(drift + diffusion);
    }
    results.push(p);
  }
  results.sort((a, b) => a - b);
  return results;
}

async function fetchHistory(symbol, period = "1y") {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=${encodeURIComponent(period)}&interval=1d`;
    const r = await axios.get(url, { timeout: 8000 });
    const result = r.data?.chart?.result?.[0];
    if (!result) return null;
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const candles = timestamps.map((t, i) => ({
      date: new Date(t * 1000).toISOString().slice(0, 10),
      close: quote.close?.[i],
    }));
    return candles.filter((c) => c.close != null);
  } catch (err) {
    console.warn("fetchHistory fail", symbol, err.message);
    return null;
  }
}

// ----------------- Monte Carlo -----------------
router.post("/montecarlo", auth, async (req, res) => {
  try {
    const { symbol, startPrice, months = 12, sims = 1000, mu = 0.10, sigma = 0.25 } =
      req.body;
    const sp =
      Number(startPrice) ||
      (symbol ? Number((await fetchStock(symbol)).price) : null) ||
      null;
    if (!sp) return res.status(400).json({ message: "startPrice required or unknown symbol" });

    const samples = monteCarloSim(Number(sp), Number(mu), Number(sigma), Number(months), Number(sims));
    const median = samples[Math.floor(samples.length / 2)];
    const p90 = samples[Math.floor(samples.length * 0.9)];
    res.json({ symbol, startPrice: sp, median, p90, samples });
  } catch (err) {
    console.error("/montecarlo error", err);
    res.status(500).json({ message: "server error" });
  }
});

// ----------------- Backtest Save -----------------
router.post("/backtest/save", auth, async (req, res) => {
  try {
    const { planId, forecastDates = [], forecastValues = [] } = req.body;
    if (!planId) return res.status(400).json({ message: "planId required" });
    await GoalPlan.findByIdAndUpdate(planId, {
      $set: { forecast: { dates: forecastDates, values: forecastValues }, forecastSavedAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("/backtest/save", err);
    res.status(500).json({ message: "server error" });
  }
});

// ----------------- Backtest Evaluate -----------------
router.get("/backtest/evaluate/:planId", auth, async (req, res) => {
  try {
    const plan = await GoalPlan.findById(req.params.planId).lean();
    if (!plan || !plan.forecast) return res.status(400).json({ message: "No forecast stored for this plan" });

    const symbol = plan.stocks?.[0]?.symbol || null;
    if (!symbol) return res.status(400).json({ message: "No tracked symbol in plan" });

    const historical = await fetchHistory(symbol, "2y");
    if (!historical) return res.status(500).json({ message: "Unable to fetch historicals" });

    const actualMap = Object.fromEntries(historical.map((h) => [h.date, Number(h.close)]));
    const fcDates = plan.forecast.dates || [];
    const fcVals = plan.forecast.values || [];
    const pairs = [];
    for (let i = 0; i < fcDates.length; i++) {
      const d = fcDates[i];
      if (actualMap[d] != null) pairs.push({ date: d, forecast: Number(fcVals[i]), actual: actualMap[d] });
    }
    if (!pairs.length) return res.status(400).json({ message: "No matching dates in historicals" });

    const mape = (pairs.reduce((s, p) => s + Math.abs((p.actual - p.forecast) / p.actual), 0) / pairs.length) * 100;
    res.json({ planId: plan._id, symbol, pairs, mape });
  } catch (err) {
    console.error("/backtest/evaluate", err);
    res.status(500).json({ message: "server error" });
  }
});

// ----------------- Heatmap -----------------
router.get("/heatmap", auth, async (req, res) => {
  try {
    const symbols = req.query.symbols
      ? String(req.query.symbols).split(",")
      : ["INFY.NS", "TCS.NS", "HDFCBANK.NS", "RELIANCE.NS", "ITC.NS", "BTC-USD", "ETH-USD"];
    const key = `heatmap:${symbols.join(",")}`;
    const cached = cache.get(key);
    if (cached) return res.json(cached);

    const arr = await Promise.all(symbols.map((s) => fetchStock(s)));
    const out = arr.map((a) => ({ symbol: a.symbol, price: a.price, growth: a.growth, source: a.source }));
    cache.set(key, out);
    res.json(out);
  } catch (err) {
    console.error("/heatmap", err);
    res.status(500).json({ message: "server error" });
  }
});

// ----------------- Sparklines -----------------
router.get("/sparklines", auth, async (req, res) => {
  try {
    const symbol = req.query.symbol;
    if (!symbol) return res.status(400).json({ message: "symbol query required" });
    const candles = await fetchHistory(symbol, "2mo");
    if (!candles) return res.status(500).json({ message: "no data" });
    const closes = candles.slice(-30).map((c) => c.close);
    res.json({ symbol, closes });
  } catch (err) {
    console.error("/sparklines", err);
    res.status(500).json({ message: "server error" });
  }
});

// ----------------- Optimize -----------------
router.post("/optimize", auth, async (req, res) => {
  try {
    const { targetAmount, months, riskLevel = "medium" } = req.body;
    const monthlyRate = Math.pow(1 + (riskLevel === "low" ? 0.08 : riskLevel === "high" ? 0.12 : 0.10), 1 / 12) - 1;
    const suggestedSIP = Math.max(100, Math.ceil((targetAmount / months) * 0.9));
    res.json({ suggestedSIP, reason: "Simple heuristic (adjust SIP to meet target)." });
  } catch (err) {
    console.error("/optimize", err);
    res.status(500).json({ message: "server error" });
  }
});

// ----------------- Moodboard -----------------
router.post("/moodboard", auth, async (req, res) => {
  try {
    const { query = "beach holiday" } = req.body;
    const images = [
      `https://source.unsplash.com/collection/190727/800x600/?${encodeURIComponent(query)}`,
      `https://source.unsplash.com/collection/190727/800x600/?${encodeURIComponent(query)}&sig=1`,
      `https://source.unsplash.com/collection/190727/800x600/?${encodeURIComponent(query)}&sig=2`,
    ];
    const cost = Math.round(Math.random() * 50000 + 20000);
    const timelineMonths = Math.ceil(Math.random() * 12 + 1);
    res.json({ images, cost, timelineMonths, headline: `${query} — estimated ₹${cost}` });
  } catch (err) {
    console.error("/moodboard", err);
    res.status(500).json({ message: "server error" });
  }
});

// ----------------- Alerts (in-memory) -----------------
const ALERTS = [];
router.post("/alerts/register", auth, (req, res) => {
  const userId = req.user.id;
  const { symbol, threshold, type = "below" } = req.body;
  ALERTS.push({ id: ALERTS.length + 1, userId, symbol, threshold, type, createdAt: new Date() });
  res.json({ ok: true, alertId: ALERTS.length });
});
router.post("/alerts/test", auth, async (req, res) => {
  try {
    const { symbol, threshold, type = "below" } = req.body;
    const s = await fetchStock(symbol);
    res.json({
      symbol,
      current: s.price,
      triggered: type === "below" ? s.price < threshold : s.price > threshold,
      source: s.source,
    });
  } catch (err) {
    console.error("/alerts/test", err);
    res.status(500).json({ message: "server error" });
  }
});

// simple test root
router.get("/", (req, res) => res.json({ ok: true, message: "Feature routes active" }));

export default router;
