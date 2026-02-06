import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client";
import axios from "axios";

const app = express();
const prisma = new PrismaClient();
app.use(cors());
app.use(bodyParser.json());

// ✅ Home route
app.get("/", (req, res) => res.send("CredVest backend running 🚀"));

// ✅ User signup
app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const user = await prisma.user.create({
      data: { name, email, password },
    });
    res.json({ success: true, user });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// ✅ User login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.password !== password)
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  res.json({ success: true, user });
});

// ✅ Simple stock prediction (mocked)
app.get("/api/stocks/:symbol", async (req, res) => {
  const { symbol } = req.params;
  try {
    // Example: pulling from Yahoo Finance unofficial API
    const { data } = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: "Stock fetch failed" });
  }
});

// ✅ Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
