import Loan from "../models/Loan.js";
import User from "../models/User.js";

export const createLoan = async (req, res) => {
  try {
    const { userId, lender, totalAmount, paidAmount, emiAmount, dueDate } = req.body;
    if (!userId || !lender || totalAmount == null)
      return res.status(400).json({ message: "userId, lender, totalAmount required" });

    const loan = await Loan.create({ lender, totalAmount, paidAmount, emiAmount, dueDate });
    await User.findByIdAndUpdate(userId, { $push: { loan: loan._id } });
    res.status(201).json({ message: "Loan added", loan });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
};

export const getLoans = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const user = await User.findById(userId).populate("loan");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ loans: user.loan || [] });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
};

export const updateLoan = async (req, res) => {
  try {
    const { loanId, lender, totalAmount, paidAmount, emiAmount, dueDate, paymentHistory } = req.body;
    if (!loanId) return res.status(400).json({ message: "loanId required" });

    const updated = await Loan.findByIdAndUpdate(
      loanId, { lender, totalAmount, paidAmount, emiAmount, dueDate, paymentHistory }, { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Loan not found" });
    res.status(200).json({ message: "Loan updated", loan: updated });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
};

export const deleteLoan = async (req, res) => {
  try {
    const { userId, loanId } = req.body;
    if (!userId || !loanId) return res.status(400).json({ message: "userId & loanId required" });

    const deleted = await Loan.findByIdAndDelete(loanId);
    if (!deleted) return res.status(404).json({ message: "Loan not found" });

    await User.findByIdAndUpdate(userId, { $pull: { loan: loanId } });
    res.status(200).json({ message: "Loan deleted" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
};
