import express from "express";
import Branch from "../models/Branch.js";
import auth from "../middleware/auth.js"; // optional, if you want to use auth

const router = express.Router();

/**
 * GET /api/branches
 * Query params:
 *   bank (optional) - bankKey or bankName to filter
 *   region (optional) - city / state
 *
 * If you protect this route with auth, you can also choose to ignore 'bank' param
 * and derive bank from req.user.bankKey.
 */
router.get("/", auth /* optional */, async (req, res) => {
  try {
    // prefer bank from logged-in user, fallback to query param
    let bank = req.user?.bankKey || req.query.bank;
    if (!bank) return res.status(400).json({ error: "bank query required" });

    const region = req.query.region;
    const q = { bankKey: bank };
    if (region) {
      // match city or state loosely
      q.$or = [{ city: new RegExp(region, "i") }, { state: new RegExp(region, "i") }];
    }
    const branches = await Branch.find(q).sort({ type: 1, name: 1 }).lean();
    res.json(branches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

export default router;
