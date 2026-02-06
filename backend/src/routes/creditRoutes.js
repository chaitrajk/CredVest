// backend/src/routes/creditRoutes.js
import express from "express";
import auth from "../middleware/auth.js";

const router = express.Router();

// Simple in-memory card data for now
const cardData = {
  type: "Visa",
  creditLimit: 100000,
  balance: 12500,
  get availableCredit() {
    return this.creditLimit - this.balance;
  },
  interestRate: 18.99,
  status: "Active",
  creditScore: 750,
  creditAge: "3 years, 2 months",
  lastUpdated: "2025-10-25",
};

// GET /api/credit/cards
router.get("/cards", auth, async (req, res) => {
  res.json({ card: cardData });
});

// POST /api/credit/cards/pay
// - Validates amount
// - Updates in-memory balance
// - Creates a Transaction (debit) if Transaction model exists
// - Attempts to decrement User balance (if User model exists)
// - Emits socket events: balanceUpdated and dashboard:refresh
router.post("/cards/pay", auth, async (req, res) => {
  const { amount } = req.body;
  const amt = Number(amount);

  if (!amt || amt <= 0) {
    return res.status(400).json({ message: "Invalid payment amount" });
  }

  // 1) Update in-memory card data
  cardData.balance = Math.max(0, cardData.balance - amt);
  cardData.lastUpdated = new Date().toISOString().slice(0, 10);

  // 2) Best-effort: persist Transaction (debit)
  (async () => {
    try {
      const mod = await import("../../models/Transaction.js").catch(() => null);
      const Transaction = mod?.default || null;
      if (Transaction) {
        await Transaction.create({
          // adapt field names if your schema differs
          userId: req.user?.id || null,
          type: "debit", // debit = money out / payment
          amount: amt,
          date: new Date(),
          category: "credit_card_payment",
          description: `Credit card payment of ${amt}`,
          meta: { source: "creditRoutes" },
        });
      }
    } catch (err) {
      console.warn("Could not persist Transaction:", err.message);
    }
  })();

  // 3) Best-effort: decrement User balance fields if model exists
  (async () => {
    try {
      const mod = await import("../../models/User.js").catch(() => null);
      const User = mod?.default || null;
      if (User && req.user?.id) {
        // try common field names; ignore failures
        await User.updateOne({ _id: req.user.id }, { $inc: { balance: -amt } }).catch(() => null);
        await User.updateOne({ _id: req.user.id }, { $inc: { dashboardBalance: -amt } }).catch(() => null);
      }
    } catch (err) {
      console.warn("Could not update User model balance:", err.message);
    }
  })();

  // 4) Emit socket events so frontends update in real-time
  try {
    const io = req.app && req.app.get("io");
    if (io) {
      // quick card-level update
      io.emit("balanceUpdated", {
        userId: req.user?.id || null,
        newBalance: cardData.balance,
        availableCredit: cardData.availableCredit,
        timestamp: Date.now(),
      });

      // tell dashboards to re-fetch authoritative numbers
      io.emit("dashboard:refresh", { userId: req.user?.id || null });
    }
  } catch (err) {
    console.warn("Socket emit failed:", err.message);
  }

  // 5) Return updated card info
  return res.json({
    success: true,
    balance: cardData.balance,
    availableCredit: cardData.availableCredit,
  });
});

// GET /api/credit/cards/statements
router.get("/cards/statements", auth, async (req, res) => {
  const statements = [
    { date: "2025-11-05", description: "Amazon Purchase", amount: -2500 },
    { date: "2025-10-29", description: "Netflix Subscription", amount: -499 },
    { date: "2025-10-20", description: "Credit Payment", amount: +5000 },
  ];
  res.json({ statements });
});

// POST /api/credit/cards/settings
router.post("/cards/settings", auth, async (req, res) => {
  // In a real app you'd persist user-specific settings
  res.json({ success: true, message: "Card settings updated successfully." });
});

export default router;
