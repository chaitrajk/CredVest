// src/models/Expense.js
import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, required: true }, // e.g. Food, Rent, Utilities
    description: { type: String },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

const Expense = mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
export default Expense;
