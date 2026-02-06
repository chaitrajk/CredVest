import Notification from "../models/Notification.js";
import User from "../models/User.js";

export const createNotification = async (req, res) => {
  try {
    const { userId, type, message, isRead, date } = req.body;
    if (!userId || !type) return res.status(400).json({ message: "userId & type required" });

    const notification = await Notification.create({ type, message, isRead, date });
    await User.findByIdAndUpdate(userId, { $push: { notification: notification._id } });
    res.status(201).json({ message: "Notification created", notification });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
};

export const getNotifications = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const user = await User.findById(userId).populate("notification");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ notifications: user.notification || [] });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
};

export const updateNotification = async (req, res) => {
  try {
    const { notificationId, type, message, isRead, date } = req.body;
    if (!notificationId) return res.status(400).json({ message: "notificationId required" });

    const updated = await Notification.findByIdAndUpdate(
      notificationId, { type, message, isRead, date }, { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Notification not found" });
    res.status(200).json({ message: "Notification updated", notification: updated });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
};

export const deleteNotification = async (req, res) => {
  try {
    const { userId, notificationId } = req.body;
    if (!userId || !notificationId) return res.status(400).json({ message: "userId & notificationId required" });

    const deleted = await Notification.findByIdAndDelete(notificationId);
    if (!deleted) return res.status(404).json({ message: "Notification not found" });

    await User.findByIdAndUpdate(userId, { $pull: { notification: notificationId } });
    res.status(200).json({ message: "Notification deleted" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
};
