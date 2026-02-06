// backend/src/routes/transactionRoutes.js
import express from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

const router = express.Router();

/**
 * POST /api/transactions
 * Used by OCR and manual split saving.
 */
router.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    let {
      type = "debit",
      description,
      amount,
      date,
      merchant,
      source = "manual",
      billImage,
      split,
      category,
      items, // OCR items
    } = req.body;

    const baseDate = date ? new Date(date) : new Date();
    const normType =
      typeof type === "string" && type.toLowerCase() === "credit"
        ? "credit"
        : "debit";

    // SPLIT rows
    const rows =
      Array.isArray(split) && split.length
        ? split.map((s) => ({
            category: s.category || "Others",
            amount: Number(s.amount) || 0,
          }))
        : [
            {
              category: category || "Others",
              amount: Number(amount || 0),
            },
          ];

    if (!description) description = "Transaction";

    const saved = [];

    for (const row of rows) {
      if (!row.amount || row.amount <= 0) continue;

      const tx = new Transaction({
        userId,
        category: row.category,
        description,
        amount: Number(row.amount),
        type: normType,
        date: baseDate,
        source,
        merchant,
        billImage,
        items: items || [],
      });

      await tx.save();
      saved.push(tx);
    }

    if (!saved.length) {
      return res.status(400).json({ message: "No valid entries to save" });
    }

    return res.status(201).json({
      message: "Transaction(s) saved",
      transactions: saved,
    });
  } catch (err) {
    console.error("Error saving transaction:", err);
    return res.status(500).json({ message: "Server error while saving" });
  }
});

/**
 * POST /api/transactions/action
 * Quick action that creates a single transaction record.
 */
router.post("/action", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    let { category, description, amount, type = "debit", date } = req.body;

    if (!category || typeof amount === "undefined") {
      return res
        .status(400)
        .json({ message: "category and amount are required" });
    }

    const normType =
      typeof type === "string" && type.toLowerCase() === "credit"
        ? "credit"
        : "debit";

    const tx = await Transaction.create({
      userId,
      category,
      description: description || category,
      amount: Number(amount),
      type: normType,
      date: date ? new Date(date) : new Date(),
      source: "action",
    });

    return res.json({ success: true, transaction: tx });
  } catch (err) {
    console.error("Error in /action:", err);
    return res.status(500).json({ message: "Server error in /action" });
  }
});

/**
 * POST /api/transactions/transfer
 * Body: { toAccount, amount, description }
 * Creates a debit transaction for sender and (if internal) a credit tx for recipient.
 */
router.post("/transfer", auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const senderId = req.user.id;
    const { toAccount, amount, description } = req.body;

    if (!toAccount || amount == null) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "toAccount & amount required" });
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Create sender debit transaction
    const [senderTx] = await Transaction.create([{
      userId: senderId,
      category: "Transfer",
      description: description || `Transfer to ${toAccount}`,
      amount: amt,
      type: "debit",
      date: new Date(),
      source: "transfer"
    }], { session });

    // Try to push transaction id to sender.user.transactions if your User stores refs
    try {
      await User.findByIdAndUpdate(senderId, { $push: { transactions: senderTx._id } }, { session });
    } catch (e) {
      console.warn("Could not push sender transaction ref:", e.message);
    }

    // If recipient is an internal user (accountNumber stored on User), credit them
    const recipient = await User.findOne({ accountNumber: toAccount }).session(session);
    if (recipient) {
      const [recipientTx] = await Transaction.create([{
        userId: recipient._id,
        category: "Transfer Received",
        description: description || `Received from ${req.user.email || senderId}`,
        amount: amt,
        type: "credit",
        date: new Date(),
        source: "transfer"
      }], { session });

      try {
        await User.findByIdAndUpdate(recipient._id, { $push: { transactions: recipientTx._id } }, { session });
      } catch (e) {
        console.warn("Could not push recipient transaction ref:", e.message);
      }
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({ message: "Transfer successful", transaction: senderTx });
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    session.endSession();
    console.error("Transfer error:", err);
    return res.status(500).json({ message: err.message || "Transfer failed" });
  }
});

/**
 * GET /api/transactions/list
 * Query: month, year, category
 */
router.get("/list", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year, category } = req.query;

    const filter = { userId: new mongoose.Types.ObjectId(userId) };

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 1);
      filter.date = { $gte: start, $lt: end };
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    const txs = await Transaction.find(filter).sort({ date: -1 }).lean();

    return res.json({ transactions: txs });
  } catch (err) {
    console.error("Error listing:", err);
    return res.status(500).json({ message: "Server error listing" });
  }
});

/**
 * GET /api/transactions/ocr
 */
router.get("/ocr", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const tx = await Transaction.find({
      userId: new mongoose.Types.ObjectId(userId),
      source: "OCR",
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ transactions: tx });
  } catch (err) {
    console.error("OCR history error:", err);
    return res.status(500).json({ message: "Server error loading OCR history" });
  }
});

/**
 * GET /api/transactions/summary
 */
router.get("/summary", auth, async (req, res) => {
  try {
    const { period = "month" } = req.query;
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();

    let start, end;
    if (period === "week") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (period === "year") {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    const stats = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: { type: "$type", category: "$category" },
          total: { $sum: "$amount" },
        },
      },
    ]);

    let totalCredit = 0;
    let totalDebit = 0;
    const byCategory = {};

    for (const s of stats) {
      const t = (s._id.type || "").toLowerCase();
      const cat = s._id.category || "Others";

      if (t === "credit") totalCredit += s.total;
      else totalDebit += s.total;

      byCategory[cat] = (byCategory[cat] || 0) + s.total;
    }

    return res.json({
      period,
      totalCredit,
      totalDebit,
      balance: totalCredit - totalDebit,
      byCategory,
    });
  } catch (err) {
    console.error("Summary error:", err);
    return res.status(500).json({ message: "Server error calculating summary" });
  }
});

/**
 * DELETE /api/transactions/:id
 * NEW — needed for OCR delete button
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const txn = await Transaction.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!txn) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    await txn.deleteOne();

    return res.json({ success: true, message: "Transaction deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({
      message: "Server error while deleting",
      error: err.message,
    });
  }
});

export default router;
