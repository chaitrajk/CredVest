// src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    password: { type: String },

    // Relations
    expenses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Expense" }],
    income: [{ type: mongoose.Schema.Types.ObjectId, ref: "Income" }],
    budget: [{ type: mongoose.Schema.Types.ObjectId, ref: "Budget" }],
    goal: [{ type: mongoose.Schema.Types.ObjectId, ref: "Goal" }],
    loan: [{ type: mongoose.Schema.Types.ObjectId, ref: "Loan" }],
    notification: [{ type: mongoose.Schema.Types.ObjectId, ref: "Notification" }],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
