// src/models/Transaction.js
import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🔹 Allow ANY category (Food, Rent, Credit Card, Digital Wallet, QR Payment, Investment, etc.)
    category: {
      type: String,
      required: true,
      trim: true,
    },

    description: { type: String },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // 🔹 Support both lowercase + uppercase from older code just in case
    type: {
      type: String,
      enum: ["credit", "debit", "CREDIT", "DEBIT"],
      required: true,
    },

    date: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // for OCR / bills / digital payments
    source: { type: String, default: "manual" }, // OCR, manual, investment, etc.
    merchant: { type: String },
    billImage: { type: String },

    // 🔹 Investment-specific fields (optional)
    symbol: { type: String },           // e.g. AAPL, RELIANCE
    instrumentType: { type: String },   // Stock, Mutual Fund, ETF, etc.
    quantity: { type: Number },         // number of units / shares
    price: { type: Number },            // price per unit at trade
    side: { type: String, enum: ["BUY", "SELL"], default: undefined },
  },
  { timestamps: true }
);

// avoid OverwriteModelError during dev
const Transaction =
  mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);

export default Transaction;
