// src/models/GoalPlan.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const GoalPlanSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // basic info
    goal: { type: String, required: true }, // "Buy iPhone 17", "Europe Trip"
    targetAmount: { type: Number, required: true },
    months: { type: Number, required: true },

    // optional timing
    startDate: { type: Date, default: Date.now },
    targetDate: { type: Date }, // you can set from UI later

    // computed fields
    currentBalance: { type: Number, default: 0 },
    shortfall: { type: Number, default: 0 },
    sip: { type: Number, default: 0 },

    // 🧠 more realistic stuff
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    category: {
      type: String,
      default: "Wealth", // e.g. "Education", "Travel", "Gadget", "Emergency"
    },
    priority: {
      type: Number,
      min: 1,
      max: 5,
      default: 3, // 5 = super important
    },
    status: {
      type: String,
      enum: ["active", "completed", "on-hold"],
      default: "active",
    },

    emoji: { type: String, default: "🎯" }, // UI can show this near goal title
    notes: { type: String, default: "" },

    // allocation between assets
    allocation: {
      type: Object,
      default: {},
    },

    // live suggestions
    stocks: { type: Array, default: [] },
    funds: { type: Array, default: [] },

    // 🔮 "cool" analytics
    expectedAnnualReturn: { type: Number, default: 0.1 }, // 10%
    projectedValue: { type: Number, default: 0 }, // how much you'll roughly have
    successScore: { type: Number, default: 0 }, // 0–100 (% chance vibe)

    // UX candy
    autoInvest: { type: Boolean, default: false }, // later you can show a toggle
  },
  { timestamps: true }
);

const GoalPlan = mongoose.model("GoalPlan", GoalPlanSchema);

export default GoalPlan;
