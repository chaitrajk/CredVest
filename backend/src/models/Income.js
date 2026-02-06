// backend/src/models/Income.js
import mongoose from "mongoose";

const IncomeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }, // optional, good to attach if you have users
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, default: "Salary" },
  date: { type: Date, default: Date.now },
  notes: { type: String, default: "" }
}, { timestamps: true });

const Income = mongoose.model("Income", IncomeSchema);
export default Income;
