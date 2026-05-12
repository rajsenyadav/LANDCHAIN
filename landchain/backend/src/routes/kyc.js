// backend/src/routes/kyc.js
const express = require("express");
const { query } = require("../models/db");
const { authenticate, authorize } = require("../middleware/auth");
const ethers = require("ethers");
const router = express.Router();

const getContract = () => {
  const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_SEPOLIA_URL);
  const signer   = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);
  const abi      = require("../../abi/LandRegistry.json");
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, signer);
};

/**
 * POST /api/kyc/approve
 * Registrar approves KYC for a user wallet
 * Also calls smart contract to set kycApproved[user] = true
 */
router.post("/approve", authenticate, authorize("registrar", "admin"), async (req, res, next) => {
  try {
    const { walletAddr, name, phone } = req.body;

    // Update DB
    await query(
      `UPDATE users SET kyc_status = 'verified', name = $2, phone = $3, updated_at = NOW()
       WHERE wallet_addr = $1`,
      [walletAddr.toLowerCase(), name, phone]
    );

    // Approve on-chain
    const contract = getContract();
    const tx = await contract.approveKYC(walletAddr);
    await tx.wait();

    res.json({ success: true, txHash: tx.hash });
  } catch (err) { next(err); }
});

/**
 * POST /api/kyc/reject
 */
router.post("/reject", authenticate, authorize("registrar", "admin"), async (req, res, next) => {
  try {
    const { walletAddr, reason } = req.body;
    await query(
      `UPDATE users SET kyc_status = 'rejected' WHERE wallet_addr = $1`,
      [walletAddr.toLowerCase()]
    );
    res.json({ success: true, reason });
  } catch (err) { next(err); }
});

/**
 * GET /api/kyc/status/:wallet
 * Check KYC status for a wallet
 */
router.get("/status/:wallet", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT wallet_addr, kyc_status, name FROM users WHERE wallet_addr = $1`,
      [req.params.wallet.toLowerCase()]
    );
    if (!result.rows.length) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

/**
 * GET /api/kyc/pending
 * Registrar sees all users with pending KYC
 */
router.get("/pending", authenticate, authorize("registrar", "admin"), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, wallet_addr, name, email, phone, created_at
       FROM users WHERE kyc_status = 'pending' ORDER BY created_at ASC`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
