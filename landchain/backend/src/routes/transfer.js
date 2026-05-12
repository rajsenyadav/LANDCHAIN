// backend/src/routes/transfer.js
const express = require("express");
const ethers  = require("ethers");
const axios   = require("axios");
const { query } = require("../models/db");
const { authenticate, authorize } = require("../middleware/auth");
const router  = express.Router();

const getContract = () => {
  const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_SEPOLIA_URL);
  const signer   = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);
  const abi      = require("../../abi/LandRegistry.json");
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, signer);
};

/**
 * POST /api/transfer/initiate
 * Step 4 in workflow: Seller initiates transfer with buyer + price
 * The smart contract locks the NFT into escrow
 */
router.post("/initiate", authenticate, async (req, res, next) => {
  try {
    const { tokenId, buyerWallet, salePriceEth } = req.body;
    const sellerWallet = req.user.walletAddr;

    // Verify seller owns this parcel
    const parcel = await query(
      `SELECT * FROM land_parcels WHERE token_id = $1 AND owner_wallet = $2`,
      [tokenId, sellerWallet.toLowerCase()]
    );
    if (!parcel.rows.length) return res.status(403).json({ error: "You do not own this parcel" });

    // Verify both parties have KYC
    const buyers = await query(
      `SELECT kyc_status FROM users WHERE wallet_addr = $1`,
      [buyerWallet.toLowerCase()]
    );
    if (!buyers.rows.length || buyers.rows[0].kyc_status !== "verified") {
      return res.status(400).json({ error: "Buyer KYC not verified" });
    }

    const priceWei = ethers.parseEther(salePriceEth.toString());

    // NOTE: In production, seller calls smart contract directly from MetaMask
    // Here backend acts as relay for demo purposes
    const db = await query(
      `INSERT INTO transfer_requests (token_id, seller_wallet, buyer_wallet, sale_price_wei, kyc_verified)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [tokenId, sellerWallet.toLowerCase(), buyerWallet.toLowerCase(), priceWei.toString()]
    );

    // Trigger AI document verification asynchronously
    axios.post(`${process.env.AI_SERVICE_URL}/api/verify-documents`, {
      tokenId, ipfsCid: parcel.rows[0].ipfs_doc_cid, transferId: db.rows[0].id
    }).catch(console.error); // non-blocking

    res.json({ success: true, transfer: db.rows[0], message: "Transfer initiated. AI verification in progress." });
  } catch (err) { next(err); }
});

/**
 * POST /api/transfer/ai-callback
 * AI service calls this endpoint with verification result
 */
router.post("/ai-callback", async (req, res, next) => {
  try {
    const { transferId, tokenId, verified, confidence, fraudDetected, fraudReason } = req.body;

    // Verify this request comes from AI service (shared secret)
    if (req.headers["x-ai-secret"] !== process.env.AI_SHARED_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await query(
      `UPDATE transfer_requests SET ai_verified = $1, ai_confidence = $2, updated_at = NOW()
       WHERE id = $3`,
      [verified, confidence, transferId]
    );

    if (fraudDetected) {
      // Flag on blockchain
      const contract = getContract();
      await contract.flagFraud(tokenId, fraudReason);
      await query(
        `INSERT INTO fraud_alerts (token_id, reason, confidence) VALUES ($1, $2, $3)`,
        [tokenId, fraudReason, confidence]
      );
    } else if (verified) {
      // Mark AI verified on blockchain
      const contract = getContract();
      await contract.setAIVerified(tokenId, true);
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

/**
 * POST /api/transfer/:tokenId/approve — Registrar approves
 */
router.post("/:tokenId/approve", authenticate, authorize("registrar", "admin"),
  async (req, res, next) => {
    try {
      const { tokenId } = req.params;

      const contract = getContract();
      const tx = await contract.registrarApprove(tokenId);
      await tx.wait();

      await query(
        `UPDATE transfer_requests SET registrar_approved = true, updated_at = NOW()
         WHERE token_id = $1 AND executed = false`,
        [tokenId]
      );

      res.json({ success: true, txHash: tx.hash });
    } catch (err) { next(err); }
  }
);

/**
 * POST /api/transfer/:tokenId/cancel — Registrar cancels + refunds buyer
 */
router.post("/:tokenId/cancel", authenticate, authorize("registrar", "admin"),
  async (req, res, next) => {
    try {
      const { tokenId } = req.params;
      const { reason } = req.body;

      const contract = getContract();
      const tx = await contract.cancelTransfer(tokenId);
      await tx.wait();

      await query(
        `UPDATE transfer_requests SET status = 'cancelled', updated_at = NOW()
         WHERE token_id = $1 AND executed = false`,
        [tokenId]
      );

      res.json({ success: true, txHash: tx.hash, message: `Transfer cancelled: ${reason}` });
    } catch (err) { next(err); }
  }
);

/**
 * GET /api/transfer/:tokenId — get transfer status
 */
router.get("/:tokenId", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM transfer_requests WHERE token_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.params.tokenId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "No transfer found" });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
