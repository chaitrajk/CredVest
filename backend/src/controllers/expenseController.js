// src/controllers/expenseController.js
import Expense from "../models/Expense.js";
import User from "../models/User.js";

// Create Expense and link to user
export const createExpense = async (req, res) => {
  try {
    const { userId, amount, category, description, date, isRecurring, receiptImage } = req.body;

    if (!userId || amount == null || !category) {
      return res.status(400).json({ message: "userId, amount, category are required" });
    }

    const expense = await Expense.create({
      amount,
      category,
      description,
      date,
      isRecurring,
      receiptImage,
    });

    await User.findByIdAndUpdate(userId, { $push: { expenses: expense._id } });

    res.status(201).json({ message: "Expense created", expense });
  } catch (error) {
    console.error("createExpense error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all Expenses for a user
export const getExpenses = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const user = await User.findById(userId).populate("expenses");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ expenses: user.expenses || [] });
  } catch (error) {
    console.error("getExpenses error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Expense
export const updateExpense = async (req, res) => {
  try {
    const { expenseId, amount, category, description, date, isRecurring, receiptImage } = req.body;
    if (!expenseId) return res.status(400).json({ message: "expenseId is required" });

    const updated = await Expense.findByIdAndUpdate(
      expenseId,
      { amount, category, description, date, isRecurring, receiptImage },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Expense not found" });

    res.status(200).json({ message: "Expense updated", expense: updated });
  } catch (error) {
    console.error("updateExpense error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete Expense and unlink from user
export const deleteExpense = async (req, res) => {
  try {
    const { userId, expenseId } = req.body;
    if (!userId || !expenseId) return res.status(400).json({ message: "userId and expenseId are required" });

    const deleted = await Expense.findByIdAndDelete(expenseId);
    if (!deleted) return res.status(404).json({ message: "Expense not found" });

    await User.findByIdAndUpdate(userId, { $pull: { expenses: expenseId } });

    res.status(200).json({ message: "Expense deleted" });
  } catch (error) {
    console.error("deleteExpense error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
