// src/routes/budgetRoutes.js
import express from "express";
// Works with BOTH CommonJS (module.exports = {...}) and ESM (export const ...)
import * as budgetController from "../controllers/budgetController.js";

const ctrl = budgetController.default ?? budgetController;
const { createBudget, getBudgets, updateBudget, deleteBudget } = ctrl;

const router = express.Router();

// Only POST requests
router.post("/create", createBudget);
router.post("/get", getBudgets);
router.post("/update", updateBudget);
router.post("/delete", deleteBudget);

export default router;
