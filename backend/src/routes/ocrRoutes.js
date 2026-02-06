// backend/src/routes/ocrRoutes.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import Tesseract from "tesseract.js";
import auth from "../middleware/auth.js";
import fetch from "node-fetch";
import PDFDocument from "pdfkit";
import dayjs from "dayjs";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload directory
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// -------------------- Helper Functions --------------------

const cleanNumberString = (s) => {
  if (!s) return null;
  const cleaned = String(s).replace(/[^\d.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
};

const lastNumericToken = (line) => {
  const matches = line.match(/(\d+\.?\d{0,2})/g);
  if (!matches) return null;
  return cleanNumberString(matches[matches.length - 1]);
};

const extractDate = (text) => {
  const patterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
    /([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})/,
  ];
  for (const p of patterns) {
    const found = text.match(p);
    if (found) return found[1];
  }
  return null;
};

const extractMerchant = (lines) => {
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const l = lines[i].trim();
    if (!l) continue;
    if (/invoice|bill|gst|tax|date/i.test(l)) continue;
    if (l.split(" ").length <= 6) return l;
  }
  return "Unknown Merchant";
};

const extractItems = (text) => {
  const lines = text.split("\n").map((l) => l.trim());
  const skip = /(subtotal|total|tax|gst|amount due|amount payable)/i;
  const items = [];

  for (const line of lines) {
    if (skip.test(line)) continue;
    const amount = lastNumericToken(line);
    if (!amount) continue;

    // Remove the numeric token from the end for better item name extraction
    const name = line.replace(/(\d+\.?\d{0,2})\s*$/, "").trim();
    if (!name) continue;

    items.push({
      name,
      amount,
    });
  }
  return items;
};

const computeTotal = (text) => {
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const n = lastNumericToken(lines[i]);
    if (n && n > 1) return n;
  }
  return 0;
};

// -------------------- Additional Detection Helpers --------------------

// Detect common GST/Tax lines; returns numeric sums where possible
const detectGSTBreakup = (text) => {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const taxes = { CGST: 0, SGST: 0, IGST: 0, GST_TOTAL: 0 };
  const gstRegex = /(?:cgst|sgst|igst|gst)\s*[:\-]?\s*([\d,]+\.\d{1,2}|[\d,]+)/i;

  for (const l of lines) {
    const m = l.match(gstRegex);
    if (m) {
      const val = parseFloat((m[1] || "0").replace(/,/g, ""));
      if (/cgst/i.test(l)) taxes.CGST += val;
      else if (/sgst/i.test(l)) taxes.SGST += val;
      else if (/igst/i.test(l)) taxes.IGST += val;
      taxes.GST_TOTAL += val;
    } else {
      // fallback: lines containing 'tax' but no explicit label
      if (/tax/i.test(l) && !/total/i.test(l)) {
        const n = l.match(/(\d+[\d,.]*\.?\d?)/g);
        if (n && n.length) {
          const last = parseFloat(n[n.length - 1].replace(/,/g, ""));
          if (!Number.isNaN(last)) taxes.GST_TOTAL += last;
        }
      }
    }
  }

  // Normalize 0 -> null for clearer responses
  Object.keys(taxes).forEach((k) => {
    taxes[k] = taxes[k] === 0 ? 0 : Number(taxes[k].toFixed(2));
  });

  return taxes;
};

// Subscription detection by keyword (simple)
const SUB_KEYWORDS = [
  "netflix",
  "spotify",
  "hotstar",
  "prime",
  "amazon prime",
  "zomato gold",
  "gaana",
  "google drive",
  "dropbox",
  "spotify",
  "hulu",
  "hotstar",
];
const detectSubscription = (text) => {
  const lc = (text || "").toLowerCase();
  for (const kw of SUB_KEYWORDS) {
    if (lc.includes(kw)) {
      // naive next billing estimate: 30 days from invoice date
      return { name: kw, matched: kw, nextBillingOffsetDays: 30 };
    }
  }
  return null;
};

// Rule-based category mapping
const CATEGORY_RULES = [
  { pattern: /mcdonald/i, category: "Food" },
  { pattern: /dominos|pizza/i, category: "Food" },
  { pattern: /grocery|supermarket|bigbasket|zepto|grofers|dmart/i, category: "Groceries" },
  { pattern: /tneb|electricity|power bill|power/i, category: "Electricity Bill" },
  { pattern: /metro|station|uber|ola|taxi/i, category: "Transport" },
  { pattern: /h&m|zara|store|mall|shopping|flipkart|amazon/i, category: "Shopping" },
  { pattern: /netflix|spotify|hotstar|prime|hulu/i, category: "Subscriptions" },
  { pattern: /pharm|clinic|hospital|medic|medicine/i, category: "Healthcare" },
];
const ruleBasedCategory = (merchant = "", itemsText = "", rawText = "") => {
  const hay = `${merchant} ${itemsText} ${rawText}`.toLowerCase();
  for (const r of CATEGORY_RULES) {
    if (r.pattern.test(hay)) return r.category;
  }
  return "Others";
};

// Optional GPT-based classification (fallback)
const openaiClassify = async (text) => {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const prompt = `Classify this receipt into one of: Food, Groceries, Rent, Subscriptions, Transport, Shopping, Healthcare, Dining, Others.\n\nReceipt text:\n${text}\n\nAnswer in JSON: {"category":"<one>","reason":"<short reason>"}`;
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0,
      }),
    });
    const j = await resp.json();
    const txt = j?.choices?.[0]?.message?.content || "";
    // Try to robustly extract JSON from model output
    const firstBrace = txt.indexOf("{");
    const lastBrace = txt.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      const candidate = txt.slice(firstBrace, lastBrace + 1);
      try {
        const parsed = JSON.parse(candidate);
        return parsed;
      } catch (e) {
        // parsing failed - return raw text as fallback
        return { category: null, reason: txt };
      }
    }
    return { category: null, reason: txt };
  } catch (e) {
    console.warn("OpenAI classify failed", e);
    return null;
  }
};

// -------------------- OCR ENDPOINT (existing) --------------------

router.post("/analyze", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Save the uploaded image
    const ext = path.extname(req.file.originalname) || ".png";
    const filename =
      Date.now() + "_" + Math.random().toString(36).slice(2, 8) + ext;
    const savePath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(savePath, req.file.buffer);
    const imageUrl = "/uploads/" + filename;

    // Run OCR
    const ocr = await Tesseract.recognize(req.file.buffer, "eng", {
      logger: () => {},
    });
    const rawText = ocr?.data?.text || "";

    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const merchant = extractMerchant(lines);
    const date = extractDate(rawText) || new Date().toISOString().slice(0, 10);
    const items = extractItems(rawText);
    const total = computeTotal(rawText);

    return res.json({
      merchant,
      date,
      total,
      items,
      rawText,
      imageUrl,
      mainCategory: "Others",
    });
  } catch (err) {
    console.error("OCR Error:", err);
    res.status(500).json({ message: "OCR failed", error: err.message });
  }
});

// -------------------- New: classify endpoint --------------------
// POST /ocr/classify
// Body: { rawText, merchant, itemsText }
router.post("/classify", auth, upload.none(), async (req, res) => {
  try {
    const { rawText = "", merchant = "", itemsText = "" } = req.body;
    // 1) rule-based
    const ruleCat = ruleBasedCategory(merchant, itemsText, rawText);
    // 2) GST
    const taxes = detectGSTBreakup(rawText);
    // 3) subscription
    const sub = detectSubscription(rawText);
    // 4) optionally ask GPT if env var present and rule result is Others
    let gpt = null;
    if (ruleCat === "Others" && process.env.OPENAI_API_KEY) {
      gpt = await openaiClassify(`${merchant}\n\n${itemsText}\n\n${rawText}`);
    }

    return res.json({
      category: gpt?.category || ruleCat,
      reason: gpt?.reason || "rule-based",
      taxes,
      subscription: sub,
    });
  } catch (err) {
    console.error("classify error", err);
    res.status(500).json({ message: "classify failed", error: err.message });
  }
});

// -------------------- New: summarize endpoint --------------------
// POST /ocr/summarize
// Body: { rawText, merchant, date, total, items }
router.post("/summarize", auth, upload.none(), async (req, res) => {
  try {
    const { rawText = "", merchant = "", date = "", total = 0, items = [] } =
      req.body;

    if (!process.env.OPENAI_API_KEY) {
      // fallback simple summary
      const itemsCount = Array.isArray(items) ? items.length : 0;
      const msg = `You spent ₹${total} at ${merchant || "a merchant"} on ${
        date || "an unknown date"
      }. ${itemsCount} items detected.`;
      return res.json({ summary: msg });
    }

    const prompt = `Write a short, human-friendly receipt summary (2-3 lines) from the following info.\nMerchant: ${merchant}\nDate: ${date}\nTotal: ${total}\nItems: ${Array.isArray(items) ? items.map((it) => `${it.name} (${it.amount})`).join(", ") : ""}\nRawText:\n${rawText}\n\nReturn only plain text summary.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.2,
      }),
    });

    const j = await response.json();
    const summary = j?.choices?.[0]?.message?.content || `Spent ₹${total} at ${merchant}.`;
    return res.json({ summary });
  } catch (err) {
    console.error("summarize error", err);
    res.status(500).json({ message: "summarize failed", error: err.message });
  }
});

// -------------------- New: export-pdf endpoint --------------------
// POST /ocr/export-pdf
// Body: { merchant, date, total, items, taxes, rawText, imageUrl }
// Streams a generated PDF back to the client
router.post("/export-pdf", auth, upload.none(), async (req, res) => {
  try {
    const {
      merchant = "Receipt",
      date = dayjs().format("YYYY-MM-DD"),
      total = 0,
      items = [],
      taxes = {},
      rawText = "",
      imageUrl = "",
    } = req.body;

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt_${Date.now()}.pdf`
    );

    doc.fontSize(18).text(merchant || "Receipt", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).text(`Date: ${date}`);
    doc.text(`Total: ₹${total}`);
    doc.moveDown();

    if (Array.isArray(items) && items.length) {
      doc.fontSize(12).text("Items:");
      doc.moveDown(0.25);
      items.forEach((it) => {
        const line = `• ${it.name} — ₹${it.amount}`;
        doc.fontSize(10).text(line);
      });
      doc.moveDown();
    }

    if (taxes && Object.keys(taxes).length) {
      doc.fontSize(12).text("Taxes:");
      Object.keys(taxes).forEach((k) => {
        doc.fontSize(10).text(`${k}: ₹${taxes[k]}`);
      });
      doc.moveDown();
    }

    if (imageUrl) {
      // If imageUrl is a local path under uploads (starts with /uploads/filename), try to attach
      try {
        const possiblePath = path.join(process.cwd(), imageUrl.replace(/^\//, ""));
        if (fs.existsSync(possiblePath)) {
          doc.addPage();
          doc.image(possiblePath, { fit: [500, 400], align: "center" });
        }
      } catch (e) {
        // silently ignore image embedding errors
      }
    }

    doc.addPage();
    doc.fontSize(12).text("Original OCR (truncated):");
    doc.moveDown(0.2);
    doc.fontSize(9).text((rawText || "").slice(0, 4000), { lineGap: 2 });

    doc.end();
    doc.pipe(res);
    // do not call res.json after piping
  } catch (err) {
    console.error("pdf export failed", err);
    res.status(500).json({ message: "pdf failed", error: err.message });
  }
});

export default router;
