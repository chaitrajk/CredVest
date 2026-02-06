import express from "express";
import * as loanController from "../controllers/loanController.js";

const ctrl = loanController.default ?? loanController;
const { createLoan, getLoans, updateLoan, deleteLoan } = ctrl;

const router = express.Router();

/* ---------------------------------------------
   REST-FRIENDLY ENDPOINTS (frontend compatible)
---------------------------------------------- */

// GET /api/loan → get all loans
router.get("/", getLoans);

// POST /api/loan → create new loan
router.post("/", createLoan);

// PUT /api/loan/:id → update a loan
router.put("/:id", updateLoan);

// DELETE /api/loan/:id → delete a loan
router.delete("/:id", deleteLoan);

/* ---------------------------------------------
   BACKWARD COMPATIBILITY (your older endpoints)
---------------------------------------------- */

// POST /api/loan/get
router.post("/get", getLoans);

// POST /api/loan/create
router.post("/create", createLoan);

// POST /api/loan/update
router.post("/update", updateLoan);

// POST /api/loan/delete
router.post("/delete", deleteLoan);

export default router;
