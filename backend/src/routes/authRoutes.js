// src/routes/authRoutes.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = Router();

// ---------------------------------------------------------
// 🔐 SIGNUP
// ---------------------------------------------------------
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email + password required" });
    }

    // CHECK IF EMAIL ALREADY EXISTS
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // HASH PASSWORD
    const hashed = await bcrypt.hash(password, 10);

    // CREATE USER
    await User.create({
      email,
      name: name || "User",
      password: hashed,
    });

    return res.status(201).json({ message: "Signup successful" });

  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------
// 🔐 LOGIN
// ---------------------------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // FIND USER
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // CHECK PASSWORD MATCH
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // CREATE JWT TOKEN
    const token = jwt.sign(
      { id: user._id, email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------
// 🔐 AUTH MIDDLEWARE
// ---------------------------------------------------------
export function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach payload
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ---------------------------------------------------------
// ⚠️ TEMP ROUTE — CLEAN CORRUPTED USERS (DELETE AFTER USE)
// ---------------------------------------------------------
router.delete("/fix-users", async (req, res) => {
  try {
    const result = await User.deleteMany({
      $or: [
        { email: null },
        { email: "" },
        { email: { $exists: false } }
      ]
    });

    res.json({
      success: true,
      deleted: result.deletedCount
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
