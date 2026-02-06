import express from "express";
import * as incomeController from "../controllers/incomeController.js";

const ctrl = incomeController.default ?? incomeController; // CJS/ESM-safe
const { createIncome, getIncome, updateIncome, deleteIncome } = ctrl;

const router = express.Router();

router.post("/create", createIncome);
router.post("/get", getIncome);
router.post("/update", updateIncome);
router.post("/delete", deleteIncome);

export default router;
