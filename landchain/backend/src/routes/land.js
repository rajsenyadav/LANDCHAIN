// backend/src/routes/land.js
const express  = require("express");
const multer   = require("multer");
const { create } = require("@web3-storage/w3up-client"); // free IPFS storage
const ethers   = require("ethers");
const { query } = require("../models/db");
const { authenticate, authorize } = require("../middleware/auth");
const router   = express.Router();

// In-memory upload (files go to IPFS, not local disk)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Blockchain connection (read + write)
const getContract = () => {
  const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_SEPOLIA_URL);
  const signer   = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);
  const abi      = require("../../abi/LandRegistry.json");
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, signer);
};

/**
 * POST /api/land/register
 * Registrar mints a new land NFT
 * 1. Upload docs to IPFS (free via web3.storage)
 * 2. Call smart contract mintLand()
 * 3. Store metadata in PostgreSQL
 */
router.post("/register", authenticate, authorize("registrar", "admin"),
  upload.array("documents", 5),
  async (req, res, next) => {
    try {
      const { ownerWallet, surveyNumber, location, areaSqft } = req.body;

      // Upload documents to IPFS (free 5GB on web3.storage)
      const client = await create();
      const files  = req.files.map(f =>
        new File([f.buffer], f.originalname, { type: f.mimetype })
      );
      const cid = await client.uploadDirectory(files);
      const ipfsDocCid = cid.toString();

      // Build token metadata (stored on IPFS too)
      const metadata = {
        name: `Land Parcel #${surveyNumber}`,
        description: `LandChain AI registered parcel at ${location}`,
        attributes: [
          { trait_type: "Survey Number", value: surveyNumber },
          { trait_type: "Location",      value: location },
          { trait_type: "Area (sqft)",   value: areaSqft },
        ],
        documents: `ipfs://${ipfsDocCid}`
      };
      const metaFile = new File([JSON.stringify(metadata)], "metadata.json", { type: "application/json" });
      const metaCid  = await client.uploadFile(metaFile);
      const tokenURI = `ipfs://${metaCid.toString()}`;

      // Mint NFT on blockchain
      const contract = getContract();
      const tx = await contract.mintLand(
        ownerWallet, surveyNumber, ipfsDocCid, location, areaSqft, tokenURI
      );
      const receipt = await tx.wait();

      // Extract tokenId from event
      const event = receipt.logs
        .map(log => { try { return contract.interface.parseLog(log); } catch { return null; } })
        .find(e => e && e.name === "LandMinted");
      const tokenId = event.args.tokenId.toString();

      // Save to PostgreSQL
      await query(
        `INSERT INTO land_parcels (token_id, survey_number, owner_wallet, location, area_sqft, ipfs_doc_cid)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tokenId, surveyNumber, ownerWallet.toLowerCase(), location, areaSqft, ipfsDocCid]
      );

      // Record in ownership history
      await query(
        `INSERT INTO ownership_history (token_id, to_wallet, tx_hash)
         VALUES ($1, $2, $3)`,
        [tokenId, ownerWallet.toLowerCase(), receipt.hash]
      );

      res.json({
        success: true,
        tokenId,
        txHash: receipt.hash,
        ipfsCid: ipfsDocCid,
        tokenURI
      });
    } catch (err) { next(err); }
  }
);

/**
 * GET /api/land/search?query=Bhopal
 * Public search by location, survey number, or owner
 */
router.get("/search", async (req, res, next) => {
  try {
    const { query: q, owner } = req.query;
    let sql = `
      SELECT lp.*, u.name as owner_name
      FROM land_parcels lp
      LEFT JOIN users u ON u.wallet_addr = lp.owner_wallet
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (lp.location ILIKE $${params.length} OR lp.survey_number ILIKE $${params.length})`;
    }
    if (owner) {
      params.push(owner.toLowerCase());
      sql += ` AND lp.owner_wallet = $${params.length}`;
    }

    sql += " ORDER BY lp.registered_at DESC LIMIT 50";
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
});

/**
 * GET /api/land/:tokenId — get parcel details + full ownership history
 */
router.get("/:tokenId", async (req, res, next) => {
  try {
    const { tokenId } = req.params;

    const parcel = await query(
      `SELECT lp.*, u.name as owner_name, u.email as owner_email
       FROM land_parcels lp
       LEFT JOIN users u ON u.wallet_addr = lp.owner_wallet
       WHERE lp.token_id = $1`,
      [tokenId]
    );
    if (!parcel.rows.length) return res.status(404).json({ error: "Parcel not found" });

    const history = await query(
      `SELECT * FROM ownership_history WHERE token_id = $1 ORDER BY transferred_at DESC`,
      [tokenId]
    );

    res.json({ parcel: parcel.rows[0], history: history.rows });
  } catch (err) { next(err); }
});

module.exports = router;
