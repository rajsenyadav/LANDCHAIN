// backend/src/server.js
require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");

const authRoutes     = require("./routes/auth");
const landRoutes     = require("./routes/land");
const transferRoutes = require("./routes/transfer");
const aiRoutes       = require("./routes/ai");
const kycRoutes      = require("./routes/kyc");
const { connectDB }  = require("./models/db");
const { errorHandler } = require("./middleware/errorHandler");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));

// Rate limiting (prevents DDoS - free protection)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests, please try again later."
}));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/land",     landRoutes);
app.use("/api/transfer", transferRoutes);
app.use("/api/ai",       aiRoutes);
app.use("/api/kyc",      kycRoutes);

app.get("/health", (req, res) => res.json({ status: "ok", version: "1.0.0" }));

// ── Error Handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => console.log(`LandChain API running on port ${PORT}`));
});

module.exports = app;
