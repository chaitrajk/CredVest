// src/controllers/budgetController.js
import Budget from "../models/Budget.js";
import User from "../models/User.js";

// Create Budget and link to user
const createBudget = async (req, res) => {
  try {
    const { userId, category, amount, period, startDate, endDate } = req.body;
    if (!userId || !category || amount == null) {
      return res.status(400).json({ message: "userId, category, amount are required" });
    }

    const newBudget = await Budget.create({ category, amount, period, startDate, endDate });

    await User.findByIdAndUpdate(userId, { $push: { budget: newBudget._id } });

    res.status(201).json({ message: "Budget created", budget: newBudget });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all Budgets for a user
const getBudgets = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const user = await User.findById(userId).populate("budget");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ budgets: user.budget || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Budget
const updateBudget = async (req, res) => {
  try {
    const { budgetId, category, amount, period, startDate, endDate } = req.body;
    if (!budgetId) return res.status(400).json({ message: "budgetId is required" });

    const updatedBudget = await Budget.findByIdAndUpdate(
      budgetId,
      { category, amount, period, startDate, endDate },
      { new: true }
    );

    if (!updatedBudget) return res.status(404).json({ message: "Budget not found" });

    res.status(200).json({ message: "Budget updated", budget: updatedBudget });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete Budget and unlink from user
const deleteBudget = async (req, res) => {
  try {
    const { userId, budgetId } = req.body;
    if (!userId || !budgetId)
      return res.status(400).json({ message: "userId and budgetId are required" });

    const deleted = await Budget.findByIdAndDelete(budgetId);
    if (!deleted) return res.status(404).json({ message: "Budget not found" });

    await User.findByIdAndUpdate(userId, { $pull: { budget: budgetId } });

    res.status(200).json({ message: "Budget deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export default { createBudget, getBudgets, updateBudget, deleteBudget };
