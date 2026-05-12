// backend/src/routes/transferExtra.js
// Add this GET /pending route into transfer.js router

/**
 * GET /api/transfer/pending
 * Registrar sees all pending (not-yet-approved) transfers
 * Add this inside transfer.js:
 *
 * router.get("/pending", authenticate, authorize("registrar","admin"), async (req, res, next) => {
 *   try {
 *     const result = await query(
 *       `SELECT * FROM transfer_requests
 *        WHERE registrar_approved = false AND executed = false AND status != 'cancelled'
 *        ORDER BY created_at ASC`
 *     );
 *     res.json(result.rows);
 *   } catch (err) { next(err); }
 * });
 */

// This file is a note — paste the above route into transfer.js
