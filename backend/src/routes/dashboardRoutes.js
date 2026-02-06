// backend/src/routes/dashboardRoutes.js
import express from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import Transaction from "../models/Transaction.js";
import Income from "../models/Income.js";

const router = express.Router();

/**
 * GET /api/dashboard
 * Returns:
 *  - balance
 *  - totalCredit = (transaction credits + income total)
 *  - totalDebit
 *  - last 5 transactions
 *  - byCategory + byMonth
 */
router.get("/", auth, async (req, res) => {
  try {
    // normalize user identifier (ObjectId)
    const userIdObj = new mongoose.Types.ObjectId(req.user.id);

    // Helper: A $match clause that accepts either `userId` or `user` fields
    // (some of your existing documents may use one or the other)
    const userMatch = {
      $or: [{ userId: userIdObj }, { user: userIdObj }],
    };

    // ----------------------------------------------------
    // 1️⃣ Load last 5 transactions (most recent)
    // ----------------------------------------------------
    // Note: fetching full documents so the client can display them.
    const transactions = await Transaction.find({
      $or: [{ userId: userIdObj }, { user: userIdObj }],
    })
      .sort({ date: -1 })
      .limit(5)
      .lean();

    // ----------------------------------------------------
    // 2️⃣ Load Income collection and compute incomeTotal
    // ----------------------------------------------------
    const incomes = await Income.find({ $or: [{ userId: userIdObj }, { user: userIdObj }] }).lean();
    const incomeTotal = incomes.reduce((sum, it) => sum + (Math.abs(Number(it.amount) || 0)), 0);

    // ----------------------------------------------------
    // 3️⃣ Calculate total debit & credit from transactions (robust)
    // - Use $toLower on type and $abs on amount so capitalization and negatives don't break it
    // - Define debit/credit families — add more aliases if your app uses them
    // ----------------------------------------------------
    const debitAliases = ["debit", "payment", "expense", "withdrawal", "credit_card_payment"];
    const creditAliases = ["credit", "income", "refund", "deposit", "salary"];

    // totalDebit: sum absolute amounts where type is in debitAliases
    const totalDebitAgg = await Transaction.aggregate([
      { $match: userMatch },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: "$type" }, debitAliases] },
                { $abs: "$amount" },
                0,
              ],
            },
          },
        },
      },
    ]);
    const totalDebit = totalDebitAgg[0]?.total || 0;

    // totalCredit: sum absolute amounts where type is in creditAliases
    const totalCreditAgg = await Transaction.aggregate([
      { $match: userMatch },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: "$type" }, creditAliases] },
                { $abs: "$amount" },
                0,
              ],
            },
          },
        },
      },
    ]);
    const transactionCredit = totalCreditAgg[0]?.total || 0;

    // ----------------------------------------------------
    // 4️⃣ Combine income + transaction credit
    // ----------------------------------------------------
    const totalCredit = transactionCredit + incomeTotal;

    // ----------------------------------------------------
    // 5️⃣ Calculate balance (authoritative)
    // ----------------------------------------------------
    const balance = totalCredit - totalDebit;

    // ----------------------------------------------------
    // 6️⃣ Category-wise expenses (debits) — robust against negative amounts/case
    // ----------------------------------------------------
    const byCategory = await Transaction.aggregate([
      { $match: userMatch },
      {
        $project: {
          category: 1,
          amountAbs: { $abs: "$amount" },
          typeLower: { $toLower: "$type" },
        },
      },
      {
        $match: {
          typeLower: { $in: debitAliases },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amountAbs" },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // ----------------------------------------------------
    // 7️⃣ Monthly totals across all transactions (grouped by year, month, and normalized type)
    // ----------------------------------------------------
    const monthly = await Transaction.aggregate([
      { $match: userMatch },
      {
        $project: {
          year: { $year: "$date" },
          month: { $month: "$date" },
          typeLower: { $toLower: "$type" },
          amountAbs: { $abs: "$amount" },
        },
      },
      {
        $group: {
          _id: {
            year: "$year",
            month: "$month",
            type: "$typeLower",
          },
          total: { $sum: "$amountAbs" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // ----------------------------------------------------
    // 8️⃣ Respond
    // ----------------------------------------------------
    res.json({
      balance,
      totalCredit,
      totalDebit,
      transactions,
      incomes,
      byCategory,
      byMonth: monthly,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
