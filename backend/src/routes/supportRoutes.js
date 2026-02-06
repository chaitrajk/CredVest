import express from "express";
import axios from "axios";

const router = express.Router();

// Shared handler
async function handleSupportAsk(req, res) {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message required" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      reply: "AI is not configured on the server yet (missing OPENAI_API_KEY).",
    });
  }

  try {
    const aiRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are CredVest AI Support Assistant. Answer like a friendly customer support agent.",
          },
          { role: "user", content: message },
        ],
        temperature: 0.4,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply =
      aiRes.data?.choices?.[0]?.message?.content?.trim() ||
      "I couldn’t generate a reply, please try again.";

    return res.json({ reply });
  } catch (err) {
    console.error("🔥 Support AI error:", err.response?.data || err.message);
    return res.status(500).json({
      reply:
        "⚠️ There was an error talking to the AI service. Please try again later.",
    });
  }
}

/**
 * 🚀 WILDCARD ROUTES
 * These respond no matter HOW index.js mounted this router.
 */

// matches: /support/ask
// matches: /api/support/ask
// matches: /v1/api/support/ask
router.post("*/support/ask", handleSupportAsk);

// matches: /ask
// matches: /api/ask
// matches: /anything/ask
router.post("*/ask", handleSupportAsk);

export default router;
