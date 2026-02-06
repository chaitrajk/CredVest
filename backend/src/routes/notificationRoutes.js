import express from "express";
import * as notificationController from "../controllers/notificationController.js";

const ctrl = notificationController.default ?? notificationController; // CJS/ESM-safe
const { createNotification, getNotifications, updateNotification, deleteNotification } = ctrl;

const router = express.Router();

router.post("/create", createNotification);
router.post("/get", getNotifications);
router.post("/update", updateNotification);
router.post("/delete", deleteNotification);

export default router;
