import express from "express";
import * as userController from "../controllers/userController.js";

const ctrl = userController.default ?? userController; // CJS/ESM-safe
const { signup, login, getSingleUser, checkEmail, forgotPassword } = ctrl;

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/getuser", getSingleUser);
router.post("/checkemail", checkEmail);
router.post("/forgotPassword", forgotPassword);

export default router;
