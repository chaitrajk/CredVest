// src/routes/goalPlanRoutes.js
import express from "express";
import axios from "axios";
import auth from "../middleware/auth.js";
import AccountModel from "../models/Account.js";
import GoalPlanModel from "../models/GoalPlan.js";
import ExpenseModel from "../models/Expense.js"; // for OCR spend insights

const Account = AccountModel?.default ?? AccountModel;
const GoalPlan = GoalPlanModel?.default ?? GoalPlanModel;
const Expense = ExpenseModel?.default ?? ExpenseModel;

const router = express.Router();

// ----------------------- STOCK API (robust multi-source) -----------------------
async function fetchStock(symbol) {
  try {
    // 1) Finnhub (preferred if key provided)
    if (process.env.FINNHUB_KEY) {
      try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
          symbol
        )}&token=${process.env.FINNHUB_KEY}`;
        const r = await axios.get(url, { timeout: 4000 });
        const price = r.data?.c ?? null;
        const prev = r.data?.pc ?? null;
        if (price != null) {
          return {
            symbol,
            price,
            growth: prev ? `${(((price - prev) / prev) * 100).toFixed(2)}%` : "N/A",
            source: "finnhub",
          };
        }
      } catch (err) {
        console.warn(`[fetchStock] finnhub failed for ${symbol}:`, err.message);
        // continue fallback
      }
    }

    // 2) Alpha Vantage (if key provided)
    if (process.env.ALPHA_KEY) {
      try {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
          symbol
        )}&apikey=${process.env.ALPHA_KEY}`;
        const r = await axios.get(url, { timeout: 6000 });
        const d = r.data?.["Global Quote"] || {};
        const price = d["05. price"] ? Number(d["05. price"]) : null;
        const prev = d["08. previous close"] ? Number(d["08. previous close"]) : null;
        if (price != null) {
          return {
            symbol,
            price,
            growth: prev ? `${(((price - prev) / prev) * 100).toFixed(2)}%` : "N/A",
            source: "alphavantage",
          };
        }
      } catch (err) {
        console.warn(`[fetchStock] alphavantage failed for ${symbol}:`, err.message);
        // continue fallback
      }
    }

    // 3) Yahoo Chart API (no key, best-effort)
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol
      )}?interval=1d&range=2d`;
      const r = await axios.get(url, { timeout: 6000 });
      const result = r.data?.chart?.result?.[0];
      const meta = result?.meta || {};
      const price =
        meta?.regularMarketPrice ??
        result?.indicators?.quote?.[0]?.close?.slice(-1)[0] ??
        null;
      const prevClose = meta?.previousClose ?? null;
      if (price != null) {
        return {
          symbol,
          price,
          growth: prevClose ? `${(((price - prevClose) / prevClose) * 100).toFixed(2)}%` : "N/A",
          source: "yahoo",
        };
      }
    } catch (err) {
      console.warn(`[fetchStock] yahoo chart failed for ${symbol}:`, err.message);
    }

    // All failed
    console.error(`❌ Stock fetch failed for ${symbol}: no source returned a price.`);
    return { symbol, price: "N/A", growth: "N/A", source: "none" };
  } catch (err) {
    console.error("❌ Unexpected fetchStock error:", err);
    return { symbol, price: "N/A", growth: "N/A", source: "error" };
  }
}

// ----------------------- MUTUAL FUNDS API (robust) -----------------------
async function fetchFund(code) {
  try {
    // 1) mfapi.in (free, good for Indian mutual funds)
    try {
      const url = `https://api.mfapi.in/mf/${encodeURIComponent(code)}`;
      const r = await axios.get(url, { timeout: 6000 });
      const name = r.data?.meta?.scheme_name ?? "N/A";
      const nav = r.data?.data?.[0]?.nav ?? "N/A";
      return { name, nav, cagr: "Live", source: "mfapi" };
    } catch (err) {
      console.warn(`[fetchFund] mfapi failed for ${code}:`, err.message);
    }

    // Fallback: nothing available
    console.error(`❌ MF fetch failed for ${code}: no source returned a value.`);
    return { name: "N/A", nav: "N/A", cagr: "N/A", source: "none" };
  } catch (err) {
    console.error("❌ Unexpected fetchFund error:", err);
    return { name: "N/A", nav: "N/A", cagr: "N/A", source: "error" };
  }
}

// ----------------------- HELPERS -----------------------
function monthsFromInput(value, unit) {
  return unit === "years" ? value * 12 : value;
}

function getExpectedReturn(riskLevel) {
  if (riskLevel === "low") return 0.08;
  if (riskLevel === "high") return 0.12;
  return 0.1;
}

function getAllocation(riskLevel) {
  if (riskLevel === "low") return { MutualFunds: 60, Stocks: 20, Cash: 20 };
  if (riskLevel === "high") return { MutualFunds: 40, Stocks: 50, Cash: 10 };
  return { MutualFunds: 50, Stocks: 35, Cash: 15 };
}

// Analyze OCR spending
async function getSpendingAdvice(userId) {
  try {
    const expenses = await Expense.find({ userId }).lean();
    if (!expenses.length) return "No spending data found. Upload bills to get savings advice.";
    const byCategory = {};
    for (const e of expenses) {
      const cat = e.category || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + (e.amount || 0);
    }
    const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    if (top)
      return `You're spending the most on ${top[0]} (₹${top[1].toLocaleString()}). Try reducing this by 10–15% monthly to save more.`;
    return "Your spending pattern looks balanced. Keep tracking for tailored advice.";
  } catch (err) {
    console.error("❌ OCR insight error:", err);
    return "Could not analyze spending pattern.";
  }
}

// ----------------------- DEBUG ROUTES -----------------------
router.get("/debug/stock", async (req, res) => {
  try {
    const symbol = req.query.symbol;
    if (!symbol) return res.status(400).json({ error: "Provide ?symbol=INFY.NS or BTC-USD" });
    const result = await fetchStock(symbol);
    return res.json({ ok: true, symbol, result });
  } catch (err) {
    console.error("[debug/stock] error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get("/debug/fund", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: "Provide ?code=120716" });
    const result = await fetchFund(code);
    return res.json({ ok: true, code, result });
  } catch (err) {
    console.error("[debug/fund] error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ----------------------- CREATE PLAN (with predictions & comments) -----------------------
router.post("/plan", auth, async (req, res) => {
  try {
    // Normalize incoming body: accept many common field names and support years input
    const body = req.body || {};
    console.log("[goals/plan] incoming body:", body);

    // Goal/title
    const goal = String(body.goal ?? body.title ?? body.name ?? "").trim();

    // targetAmount: accept amount, targetAmount, target, etc.
    const targetAmountRaw =
      body.targetAmount ??
      body.target_amount ??
      body.amount ??
      body.target ??
      body.amount_str ??
      0;
    const targetAmount = Number(targetAmountRaw);

    // durationValue: accept durationValue, duration, months, years
    let durationValueRaw =
      body.durationValue ??
      body.duration_value ??
      body.duration ??
      body.months ??
      body.time_in_months ??
      undefined;

    // If years provided explicitly, treat as years
    const yearsRaw = body.years ?? body.year ?? body.durationYears ?? body.duration_years;
    let durationUnit = body.durationUnit ?? body.duration_unit ?? body.unit ?? "months";

    if (yearsRaw !== undefined && (durationValueRaw === undefined || durationValueRaw === null || durationValueRaw === "")) {
      durationValueRaw = Number(yearsRaw);
      durationUnit = "years";
    }

    // If months field provided and no other duration specified
    if (body.months !== undefined && durationValueRaw === undefined) {
      durationValueRaw = Number(body.months);
      durationUnit = "months";
    }

    const durationValue = Number(durationValueRaw);

    // Validate normalized values
    if (!goal || !Number.isFinite(targetAmount) || targetAmount <= 0 || !Number.isFinite(durationValue) || durationValue <= 0) {
      console.warn("[goals/plan] validation failed:", { goal, targetAmount, durationValue, durationUnit });
      return res.status(400).json({
        message: "Goal, amount, and duration are required.",
      });
    }

    // Convert to months for internal calculations
    const months = monthsFromInput(Number(durationValue), durationUnit || "months");

    // Extra cool fields
    const riskLevel = req.body.riskLevel || "medium";
    const category = req.body.category || "Wealth";
    const priority = Number(req.body.priority) || 3;
    const emoji = req.body.emoji || "🎯";
    const notes = req.body.notes || "";
    const autoInvest = !!req.body.autoInvest;

    // Account balance
    const acct = await Account.findOne({ userId: req.user.id }).lean();
    const currentBalance = acct?.balance ?? 0;

    // Spending insights
    const spendingAdvice = await getSpendingAdvice(req.user.id);

    // SIP calc
    const shortfall = Math.max(0, targetAmount - currentBalance);
    const sip = months > 0 ? Math.ceil(shortfall / months) : shortfall;

    // Risk-based projections
    const expectedAnnualReturn = getExpectedReturn(riskLevel);
    const monthlyRate = Math.pow(1 + expectedAnnualReturn, 1 / 12) - 1;
    const growthFactor = months > 0 ? Math.pow(1 + monthlyRate, months) : 1;
    const projectedValue = Math.round(
      currentBalance * growthFactor + sip * ((growthFactor - 1) / (monthlyRate || 1))
    );
    const successScore = Math.min(100, Math.round((projectedValue / targetAmount) * 100));

    const allocation = getAllocation(riskLevel);

    // Live data (best-effort; failures handled inside fetchStock/fetchFund)
    const stocksRaw = await Promise.all([
      fetchStock("INFY.NS"),
      fetchStock("TCS.NS"),
      fetchStock("HDFCBANK.NS"),
    ]);
    const fundsRaw = await Promise.all([
      fetchFund(120716),
      fetchFund(120458),
      fetchFund(119551),
    ]);

    // Enrich stocks with prediction comments
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setMonth(now.getMonth() + months);
    const targetDateStr = targetDate.toLocaleDateString();

    const stockComments = stocksRaw.map((s) => {
      const price = typeof s.price === "number" ? s.price : parseFloat(s.price) || null;
      let expectedPrice = "N/A";
      let comment = "Live price not available.";
      if (price && Number.isFinite(price)) {
        const fut = price * Math.pow(1 + expectedAnnualReturn, months / 12);
        expectedPrice = Math.round(fut * 100) / 100;
        const pct = (((expectedPrice - price) / price) * 100).toFixed(2);
        comment = `If this stock averages ~${Math.round(expectedAnnualReturn * 100)}% p.a., price could be around ₹${expectedPrice} (~${pct}% change) by ${targetDateStr}. Consider allocating part of the Stocks portion if it matches your risk profile.`;
      }
      return {
        ...s,
        expectedPrice,
        suggestion: comment,
      };
    });

    // Enrich mutual funds with simple projection (fund nav -> projected nav)
    const fundComments = fundsRaw.map((f) => {
      const nav = typeof f.nav === "number" ? f.nav : parseFloat(f.nav) || null;
      let expectedNav = "N/A";
      let comment = "Live NAV not available.";
      if (nav && Number.isFinite(nav)) {
        const futNav = nav * Math.pow(1 + expectedAnnualReturn, months / 12);
        expectedNav = Math.round(futNav * 100) / 100;
        comment = `Assuming ~${Math.round(expectedAnnualReturn * 100)}% p.a., NAV might reach ~₹${expectedNav} by ${targetDateStr}. Funds are generally less volatile than stocks.`;
      }
      return {
        ...f,
        expectedNav,
        suggestion: comment,
      };
    });

    // Save to DB
    const saved = await GoalPlan.create({
      userId: req.user.id,
      goal,
      targetAmount,
      months,
      currentBalance,
      shortfall,
      sip,
      allocation,
      stocks: stocksRaw,
      funds: fundsRaw,
      riskLevel,
      category,
      priority,
      emoji,
      notes,
      autoInvest,
      expectedAnnualReturn,
      projectedValue,
      successScore,
      spendingAdvice,
    });

    // Final response includes enriched comments for UI
    res.json({
      planId: saved._id,
      goal,
      emoji,
      category,
      riskLevel,
      months,
      targetAmount,
      currentBalance,
      sip,
      projectedValue,
      successScore,
      allocation,
      spendingAdvice,
      stocks: stocksRaw,
      funds: fundsRaw,
      stockComments,
      fundComments,
      goalProjection: {
        months,
        targetDate: targetDateStr,
        sip,
        currentBalance,
        projectedValue,
        successScore,
        message:
          shortfall === 0
            ? `You already have enough funds to achieve this goal today!`
            : `With a ₹${sip.toLocaleString()}/month SIP and an assumed ${Math.round(
                expectedAnnualReturn * 100
              )}% p.a. return, your portfolio could grow to about ₹${projectedValue.toLocaleString()} by ${targetDateStr} (success score ${successScore}%).`,
      },
      insights: [
        `💡 With a ${riskLevel} risk profile (~${Math.round(expectedAnnualReturn * 100)}% p.a.), your ₹${sip.toLocaleString()}/month investment could grow to about ₹${projectedValue.toLocaleString()} in ${durationValue} ${
          durationUnit || "months"
        }.`,
        shortfall === 0
          ? "You already have enough funds to achieve this goal today! 🥳"
          : `You're short by ₹${shortfall.toLocaleString()}. Try cutting back a bit on non-essential categories to boost savings.`,
        `📊 Based on your pattern, consider investing in "${fundComments[0]?.name || fundsRaw[0]?.name || "N/A"}" and keep an eye on "${stockComments[0]?.symbol || stocksRaw[0]?.symbol || "N/A"}".`,
      ],
    });
  } catch (err) {
    console.error("❌ Error in goal plan:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------- GET HISTORY -----------------------
router.get("/history", auth, async (req, res) => {
  try {
    const history = await GoalPlan.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const enhanced = history.map((p) => ({
      ...p,
      progressPercent:
        p.targetAmount > 0
          ? Math.round(((p.targetAmount - (p.shortfall ?? 0)) / p.targetAmount) * 100)
          : 0,
    }));

    res.json(enhanced);
  } catch (err) {
    console.error("❌ Error loading history:", err);
    res.status(500).json({ message: "Failed to load history" });
  }
});

// ----------------------- DELETE HISTORY -----------------------
router.delete("/history/:id", auth, async (req, res) => {
  try {
    const deleted = await GoalPlan.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!deleted) return res.status(404).json({ message: "Goal not found or not yours." });
    res.json({ message: "Goal plan deleted successfully." });
  } catch (err) {
    console.error("❌ Error deleting goal:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// expose helpers so other routes can reuse them
export { fetchStock, fetchFund };

export default router;
