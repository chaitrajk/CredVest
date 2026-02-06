// backend/src/controllers/incomeController.js
import Income from "../models/Income.js";
import User from "../models/User.js";

export const createIncome = async (req, res) => {
  try {
    const { userId, amount, source, description, date } = req.body;

    if (!userId || amount == null) {
      return res.status(400).json({ message: "userId & amount required" });
    }

    // FIX: Map fields correctly according to IncomeSchema
    const income = await Income.create({
      userId,
      amount: Number(amount),
      title: source || "Income",         // REQUIRED FIELD in schema
      category: source || "Other",       // category exists in schema
      notes: description || "",          // notes field exists in schema
      date: date ? new Date(date) : new Date()
    });

    // Save the income reference inside User (if needed)
    await User.findByIdAndUpdate(userId, { $push: { income: income._id } });

    return res.status(201).json({ message: "Income added", income });
  } catch (e) {
    console.error("createIncome error:", e);
    return res.status(500).json({ message: e.message || "Server error" });
  }
};

export const getIncome = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const incomes = await Income.find({ userId }).sort({ date: -1 }).lean();
    const totalIncome = incomes.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

    return res.status(200).json({ income: incomes, totalIncome });
  } catch (e) {
    console.error("getIncome error:", e);
    return res.status(500).json({ message: e.message || "Server error" });
  }
};

export const updateIncome = async (req, res) => {
  try {
    const { incomeId, amount, source, description, date } = req.body;
    if (!incomeId) return res.status(400).json({ message: "incomeId required" });

    const updated = await Income.findByIdAndUpdate(
      incomeId,
      {
        amount: amount != null ? Number(amount) : undefined,
        title: source,             // FIXED: update correct fields
        category: source,
        notes: description,
        date
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Income record not found" });

    return res.status(200).json({ message: "Income updated", income: updated });
  } catch (e) {
    console.error("updateIncome error:", e);
    return res.status(500).json({ message: e.message || "Server error" });
  }
};

export const deleteIncome = async (req, res) => {
  try {
    const { userId, incomeId } = req.body;
    if (!userId || !incomeId)
      return res.status(400).json({ message: "userId & incomeId required" });

    const deleted = await Income.findByIdAndDelete(incomeId);
    if (!deleted) return res.status(404).json({ message: "Income record not found" });

    await User.findByIdAndUpdate(userId, { $pull: { income: incomeId } });
    return res.status(200).json({ message: "Income deleted" });
  } catch (e) {
    console.error("deleteIncome error:", e);
    return res.status(500).json({ message: e.message || "Server error" });
  }
};

export default {
  createIncome,
  getIncome,
  updateIncome,
  deleteIncome
};
