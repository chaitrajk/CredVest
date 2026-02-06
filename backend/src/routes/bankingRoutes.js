// backend/src/routes/bankingRoutes.js
import express from "express";
import auth from "../middleware/auth.js";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

// Mask account number like ••••1234
const mask = (n = "") => (n ? n.replace(/\d(?=\d{4})/g, "•") : "");

// ✅ GET /api/account/me
router.get("/account/me", auth, async (req, res) => {
  try {
    const acct = await Account.findOne({ userId: req.user.id });

    if (!acct) {
      return res.json({ account: null, balance: 0 });
    }

    res.json({
      account: {
        id: acct._id,
        name: acct.holderName,
        accountNumber: mask(acct.accountNumber),
        type: acct.type,
        currency: acct.currency,
        balance: acct.balance,
        branch: acct.branch,
        ifsc: acct.ifsc,
        status: acct.status,
        openedOn: acct.createdAt,
      },
    });
  } catch (e) {
    console.error("Error in /account/me:", e);
    res.status(500).json({ message: e.message });
  }
});

// ✅ GET /api/account/transactions
router.get("/account/transactions", auth, async (req, res) => {
  try {
    const { from, to, type } = req.query;
    const acct = await Account.findOne({ userId: req.user.id });
    if (!acct) return res.json({ items: [] });

    const q = { accountId: acct._id, userId: req.user.id };

    if (type && ["CREDIT", "DEBIT"].includes(type)) q.type = type;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }

    const items = await Transaction.find(q).sort({ date: -1 }).limit(200);
    res.json({ items });
  } catch (e) {
    console.error("Error in /account/transactions:", e);
    res.status(500).json({ message: e.message });
  }
});

// ✅ POST /api/account/transactions  (salary, rent, shopping, etc.)
router.post("/account/transactions", auth, async (req, res) => {
  try {
    const { description, type, amount } = req.body;

    if (!description || !["CREDIT", "DEBIT"].includes(type) || typeof amount !== "number") {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const acct = await Account.findOne({ userId: req.user.id });
    if (!acct) return res.status(404).json({ message: "Account not found" });

    const newBalance =
      type === "CREDIT" ? acct.balance + amount : acct.balance - amount;

    if (newBalance < 0)
      return res.status(400).json({ message: "Insufficient balance" });

    const tx = await Transaction.create({
      accountId: acct._id,
      userId: req.user.id,
      description,
      type,
      amount,
      runningBalance: newBalance,
    });

    acct.balance = newBalance;
    await acct.save();

    res.status(201).json({ transaction: tx, balance: acct.balance });
  } catch (e) {
    console.error("Error creating account transaction:", e);
    res.status(500).json({ message: e.message });
  }
});

// ✅ POST /api/account  (create REAL account, no demo defaults)
router.post("/account", auth, async (req, res) => {
  try {
    const { holderName, accountNumber, type, currency, branch, ifsc, balance } =
      req.body;

    // Basic validation – required fields
    if (!holderName || !accountNumber || !type || !currency || !ifsc) {
      return res
        .status(400)
        .json({ message: "holderName, accountNumber, type, currency and ifsc are required" });
    }

    // Make sure user doesn't already have an account (if you only allow one)
    const existsForUser = await Account.findOne({ userId: req.user.id });
    if (existsForUser) {
      return res
        .status(400)
        .json({ message: "Account already exists for this user." });
    }

    // Optional: prevent duplicate account numbers globally
    const existingNumber = await Account.findOne({ accountNumber });
    if (existingNumber) {
      return res
        .status(400)
        .json({ message: "This account number is already registered." });
    }

    const acct = await Account.create({
      userId: req.user.id,
      holderName,
      accountNumber,
      type,
      currency,
      branch,
      ifsc,
      status: "Active",
      balance: Number(balance) || 0,
    });

    res.status(201).json({ message: "Account created successfully", account: acct });
  } catch (e) {
    console.error("Error creating account:", e);
    res.status(500).json({ message: e.message });
  }
});

export default router;
