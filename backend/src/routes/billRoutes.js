import express from "express";
import auth from "../middleware/auth.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/**
 * POST /api/bill/pay
 * Creates a debit transaction for bill payments
 */
router.post("/pay", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { billType, amount, dueDate, description } = req.body;

    if (!billType || !amount) {
      return res.status(400).json({ message: "billType and amount required" });
    }

    const tx = await Transaction.create({
      userId,
      category: billType,                // e.g. Electricity / Water
      description: description || billType,
      amount: Number(amount),
      type: "debit",                     // bill = debit
      date: dueDate ? new Date(dueDate) : new Date(),
      source: "bill-payment",
    });

    return res.status(201).json({
      success: true,
      message: "Bill paid successfully",
      transaction: tx,
    });
  } catch (err) {
    console.error("Bill payment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
