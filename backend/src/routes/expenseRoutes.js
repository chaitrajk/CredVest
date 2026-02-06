// src/routes/expenseRoutes.js
import express from "express";
import * as expenseController from "../controllers/expenseController.js";

const ctrl = expenseController.default ?? expenseController;
const { createExpense, getExpenses, updateExpense, deleteExpense } = ctrl;

const router = express.Router();

// Only POST requests
router.post("/create", createExpense);
router.post("/get", getExpenses);
router.post("/update", updateExpense);
router.post("/delete", deleteExpense);

export default router;
