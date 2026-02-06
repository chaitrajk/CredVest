import Goal from "../models/Goal.js";
import User from "../models/User.js";

export const createGoal = async (req, res) => {
  try {
    const { userId, title, targetAmount, currentAmount, targetDate } = req.body;
    if (!userId || !title || targetAmount == null)
      return res.status(400).json({ message: "userId, title, targetAmount required" });

    const goal = await Goal.create({ title, targetAmount, currentAmount, targetDate });
    await User.findByIdAndUpdate(userId, { $push: { goal: goal._id } });
    res.status(201).json({ message: "Goal created", goal });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
};

export const getGoals = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const user = await User.findById(userId).populate("goal");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ goals: user.goal || [] });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
};

export const updateGoal = async (req, res) => {
  try {
    const { goalId, title, targetAmount, currentAmount, targetDate } = req.body;
    if (!goalId) return res.status(400).json({ message: "goalId required" });

    const updated = await Goal.findByIdAndUpdate(
      goalId, { title, targetAmount, currentAmount, targetDate }, { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Goal not found" });
    res.status(200).json({ message: "Goal updated", goal: updated });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
};

export const deleteGoal = async (req, res) => {
  try {
    const { userId, goalId } = req.body;
    if (!userId || !goalId) return res.status(400).json({ message: "userId & goalId required" });

    const deleted = await Goal.findByIdAndDelete(goalId);
    if (!deleted) return res.status(404).json({ message: "Goal not found" });

    await User.findByIdAndUpdate(userId, { $pull: { goal: goalId } });
    res.status(200).json({ message: "Goal deleted" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
};
