// backend/src/routes/ai.js
const express = require("express");
const axios   = require("axios");
const { authenticate } = require("../middleware/auth");
const router  = express.Router();

const AI_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * POST /api/ai/valuation
 * Proxy to AI service for land valuation
 */
router.post("/valuation", async (req, res, next) => {
  try {
    const { data } = await axios.post(`${AI_URL}/api/valuation`, req.body, { timeout: 15000 });
    res.json(data);
  } catch (err) {
    res.status(503).json({ error: "AI service unavailable", detail: err.message });
  }
});

/**
 * POST /api/ai/fraud-check
 * Manual fraud check trigger (registrar use)
 */
router.post("/fraud-check", authenticate, async (req, res, next) => {
  try {
    const { data } = await axios.post(`${AI_URL}/api/fraud-check`, req.body, { timeout: 15000 });
    res.json(data);
  } catch (err) {
    res.status(503).json({ error: "AI service unavailable", detail: err.message });
  }
});

/**
 * GET /api/ai/health
 * Check if AI service is alive
 */
router.get("/health", async (req, res) => {
  try {
    const { data } = await axios.get(`${AI_URL}/health`, { timeout: 5000 });
    res.json({ aiServiceStatus: "online", ...data });
  } catch {
    res.json({ aiServiceStatus: "offline" });
  }
});

module.exports = router;
