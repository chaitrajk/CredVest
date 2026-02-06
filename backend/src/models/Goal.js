import mongoose from "mongoose";
const GoalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    targetDate: { type: Date },
  },
  { timestamps: true }
);

const Goal = mongoose.model("Goal", GoalSchema);
export default Goal;