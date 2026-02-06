// backend/src/routes/investmentRoutes.js
import express from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/**
 * POST /api/investments/buy
 * body: { symbol, instrumentType?, quantity, price }
 */
router.post("/buy", auth, async (req, res) => {
  try {
    const { symbol, instrumentType = "Stock", quantity, price } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    if (!symbol || !quantity || !price) {
      return res.status(400).json({ message: "symbol, quantity, price required" });
    }

    const amount = Number(quantity) * Number(price);

    const txn = await Transaction.create({
      userId,
      category: "Investment",
      description: `Buy ${quantity} ${symbol}`,
      amount,
      type: "debit",
      symbol,
      instrumentType,
      quantity: Number(quantity),
      price: Number(price),
      side: "BUY",
      source: "investment",
    });

    res.json({ success: true, transaction: txn });
  } catch (err) {
    console.error("Buy error:", err);
    res.status(500).json({ message: "Buy failed", error: err.message });
  }
});

/**
 * POST /api/investments/sell
 * body: { symbol, instrumentType?, quantity, price }
 */
router.post("/sell", auth, async (req, res) => {
  try {
    const { symbol, instrumentType = "Stock", quantity, price } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    if (!symbol || !quantity || !price) {
      return res.status(400).json({ message: "symbol, quantity, price required" });
    }

    const amount = Number(quantity) * Number(price);

    const txn = await Transaction.create({
      userId,
      category: "Investment",
      description: `Sell ${quantity} ${symbol}`,
      amount,
      type: "credit",
      symbol,
      instrumentType,
      quantity: Number(quantity),
      price: Number(price),
      side: "SELL",
      source: "investment",
    });

    res.json({ success: true, transaction: txn });
  } catch (err) {
    console.error("Sell error:", err);
    res.status(500).json({ message: "Sell failed", error: err.message });
  }
});

/**
 * GET /api/investments/holdings
 * Aggregates all Investment transactions into live positions.
 */
router.get("/holdings", auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const txns = await Transaction.find({
      userId,
      category: "Investment",
      symbol: { $ne: null },
    })
      .sort({ date: 1 })
      .lean();

    const map = new Map();

    for (const t of txns) {
      const key = t.symbol;
      if (!map.has(key)) {
        map.set(key, {
          symbol: t.symbol,
          instrumentType: t.instrumentType || "Security",
          quantity: 0,
          invested: 0,
          lastPrice: t.price || 0,
        });
      }
      const rec = map.get(key);
      const qty = Number(t.quantity) || 0;
      const price = Number(t.price) || 0;
      const tradeValue = qty * price;

      const isSell =
        t.side === "SELL" || (t.type && t.type.toLowerCase() === "credit");

      if (isSell) {
        rec.quantity -= qty;
        rec.invested -= tradeValue;
      } else {
        rec.quantity += qty;
        rec.invested += tradeValue;
      }

      rec.lastPrice = price || rec.lastPrice;
    }

    const holdings = [];
    for (const [, rec] of map) {
      if (rec.quantity <= 0) continue;

      const avgBuy = rec.invested / rec.quantity || 0;
      const currentPrice = rec.lastPrice || avgBuy;
      const currentValue = rec.quantity * currentPrice;
      const gain = currentValue - rec.invested;
      const ret = rec.invested ? (gain / rec.invested) * 100 : 0;

      holdings.push({
        symbol: rec.symbol,
        instrumentType: rec.instrumentType,
        quantity: +rec.quantity.toFixed(2),
        avgBuy: +avgBuy.toFixed(2),
        currentPrice: +currentPrice.toFixed(2),
        currentValue: +currentValue.toFixed(2),
        gain: +gain.toFixed(2),
        ret: +ret.toFixed(2),
      });
    }

    const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
    const totalGain = holdings.reduce((s, h) => s + h.gain, 0);
    const totalReturn = totalValue ? (totalGain / totalValue) * 100 : 0;

    res.json({
      holdings,
      summary: {
        totalValue: +totalValue.toFixed(2),
        totalGain: +totalGain.toFixed(2),
        totalReturn: +totalReturn.toFixed(2),
      },
    });
  } catch (err) {
    console.error("Holdings error:", err);
    res.status(500).json({ message: "Failed to load holdings", error: err.message });
  }
});

export default router;
