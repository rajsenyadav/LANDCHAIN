// backend/src/routes/auth.js
const express = require("express");
const jwt     = require("jsonwebtoken");
const ethers  = require("ethers");
const { query } = require("../models/db");
const router  = express.Router();

/**
 * POST /api/auth/nonce
 * Step 1: Frontend requests a nonce for this wallet address
 * User signs this nonce with MetaMask (proves ownership of wallet)
 */
router.post("/nonce", async (req, res, next) => {
  try {
    const { walletAddr } = req.body;
    if (!walletAddr) return res.status(400).json({ error: "walletAddr required" });

    const nonce = Math.floor(Math.random() * 1000000).toString();
    const message = `Sign this message to login to LandChain AI.\nNonce: ${nonce}`;

    // Upsert user record
    await query(
      `INSERT INTO users (wallet_addr) VALUES ($1)
       ON CONFLICT (wallet_addr) DO UPDATE SET updated_at = NOW()`,
      [walletAddr.toLowerCase()]
    );

    // Store nonce temporarily (in prod use Redis; here use DB)
    await query(
      `UPDATE users SET nonce = $1 WHERE wallet_addr = $2`,
      [nonce, walletAddr.toLowerCase()]
    );

    res.json({ message, nonce });
  } catch (err) { next(err); }
});

/**
 * POST /api/auth/verify
 * Step 2: Verify the signed message and issue a JWT
 */
router.post("/verify", async (req, res, next) => {
  try {
    const { walletAddr, signature } = req.body;

    const result = await query(
      `SELECT * FROM users WHERE wallet_addr = $1`,
      [walletAddr.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    const message = `Sign this message to login to LandChain AI.\nNonce: ${user.nonce}`;

    // Recover the signer address from the signature
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== walletAddr.toLowerCase()) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    // Issue JWT (expires in 24h)
    const token = jwt.sign(
      { id: user.id, walletAddr: user.wallet_addr, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: { id: user.id, walletAddr: user.wallet_addr, role: user.role, kycStatus: user.kyc_status }
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/auth/me  — get current user profile
 */
const { authenticate } = require("../middleware/auth");

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, wallet_addr, name, email, role, kyc_status, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
