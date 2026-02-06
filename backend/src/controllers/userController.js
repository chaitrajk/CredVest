import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// POST /api/user/signup
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "name, email, password required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    res.status(201).json({ message: "User registered successfully", user });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server Error" }); }
};

// POST /api/user/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "email & password required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    // Optional JWT if SECRET provided
    let token = null;
    if (process.env.JWT_SECRET) {
      token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    }

    res.status(200).json({ message: "Login successful", user, token });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server Error" }); }
};

// POST /api/user/getuser
export const getSingleUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const user = await User.findById(userId)
      .populate("expenses")
      .populate("income")
      .populate("budget")
      .populate("goal")
      .populate("loan")
      .populate("notification");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server Error" }); }
};

// POST /api/user/checkemail
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).send("User not found");
    res.status(200).send({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server Error" }); }
};

// POST /api/user/forgotPassword
export const forgotPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
      return res.status(400).json({ message: "email & newPassword required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.status(200).send({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server Error" }); }
};
