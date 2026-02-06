// src/models/Budget.js
import mongoose from "mongoose";

const BudgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, required: true }, // e.g. Food, Rent, Savings
    limit: { type: Number, required: true },
    spent: { type: Number, default: 0 },
    period: { type: String, enum: ["monthly", "weekly", "yearly"], default: "monthly" },
  },
  { timestamps: true }
);

const Budget = mongoose.models.Budget || mongoose.model("Budget", BudgetSchema);
export default Budget;
