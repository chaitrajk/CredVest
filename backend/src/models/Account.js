// backend/src/models/Account.js
import mongoose from "mongoose";

const AccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    holderName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    type: {
      type: String,
      enum: ["Savings", "Current"],
      default: "Savings",
    },
    currency: { type: String, default: "INR" },
    ifsc: { type: String },
    branch: { type: String },
    balance: { type: Number, default: 0 },

    // 🔥 IMPORTANT PART
    status: {
      type: String,
      enum: ["Active", "Inactive"], // ✅ allows "Active"
      default: "Active",            // ✅ default is "Active"
    },
  },
  { timestamps: true }
);

// avoid OverwriteModelError in dev
const Account =
  mongoose.models.Account || mongoose.model("Account", AccountSchema);

export default Account;
