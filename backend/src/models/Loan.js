// src/models/Loan.js
import mongoose from "mongoose";

const LoanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    loanType: { type: String, required: true }, // Home, Car, Personal, Education
    principalAmount: { type: Number, required: true },
    remainingAmount: { type: Number, default: 0 },
    interestRate: { type: Number, default: 0 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    status: { type: String, enum: ["active", "closed"], default: "active" },
  },
  { timestamps: true }
);

const Loan = mongoose.models.Loan || mongoose.model("Loan", LoanSchema);
export default Loan;
