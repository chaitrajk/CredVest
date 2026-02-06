// src/routes/goalRoutes.js
import express from "express";
import * as goalController from "../controllers/goalController.js";

const ctrl = goalController.default ?? goalController;
const { createGoal, getGoals, updateGoal, deleteGoal } = ctrl;

const router = express.Router();

// Only POST requests
router.post("/create", createGoal);
router.post("/get", getGoals);
router.post("/update", updateGoal);
router.post("/delete", deleteGoal);

export default router;
