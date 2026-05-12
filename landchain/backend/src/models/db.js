// backend/src/models/db.js
const { Pool } = require("pg");

/**
 * FREE PostgreSQL via Supabase:
 *   1. Go to https://supabase.com — create free project
 *   2. Get "Connection string" from Settings > Database
 *   3. Paste in .env as DATABASE_URL=postgresql://...
 */

let pool;

const connectDB = async () => {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
  });
  await pool.query("SELECT 1");
  console.log("Connected to PostgreSQL (Supabase)");

  // Run migrations on first connect
  await runMigrations();
};

const runMigrations = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_addr  VARCHAR(42) UNIQUE NOT NULL,
      name         VARCHAR(255),
      email        VARCHAR(255) UNIQUE,
      phone        VARCHAR(20),
      aadhaar_hash VARCHAR(64),  -- hashed, never store raw
      role         VARCHAR(20)   DEFAULT 'citizen' CHECK (role IN ('citizen','registrar','admin','court')),
      kyc_status   VARCHAR(20)   DEFAULT 'pending' CHECK (kyc_status IN ('pending','verified','rejected')),
      created_at   TIMESTAMPTZ  DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS land_parcels (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token_id        INTEGER UNIQUE NOT NULL,
      survey_number   VARCHAR(100) UNIQUE NOT NULL,
      owner_wallet    VARCHAR(42) NOT NULL,
      location        VARCHAR(500),
      area_sqft       INTEGER,
      ipfs_doc_cid    VARCHAR(100),  -- IPFS content identifier
      is_listed       BOOLEAN DEFAULT FALSE,
      fraud_flag      BOOLEAN DEFAULT FALSE,
      registered_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transfer_requests (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token_id            INTEGER NOT NULL REFERENCES land_parcels(token_id),
      seller_wallet       VARCHAR(42) NOT NULL,
      buyer_wallet        VARCHAR(42) NOT NULL,
      sale_price_wei      NUMERIC(30) NOT NULL,
      ai_verified         BOOLEAN DEFAULT FALSE,
      ai_confidence       DECIMAL(5,2),
      kyc_verified        BOOLEAN DEFAULT FALSE,
      buyer_paid          BOOLEAN DEFAULT FALSE,
      seller_signed       BOOLEAN DEFAULT FALSE,
      buyer_signed        BOOLEAN DEFAULT FALSE,
      registrar_approved  BOOLEAN DEFAULT FALSE,
      executed            BOOLEAN DEFAULT FALSE,
      tx_hash             VARCHAR(66),  -- blockchain transaction hash
      status              VARCHAR(30)  DEFAULT 'pending',
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ownership_history (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token_id       INTEGER NOT NULL,
      from_wallet    VARCHAR(42),
      to_wallet      VARCHAR(42) NOT NULL,
      sale_price_wei NUMERIC(30),
      tx_hash        VARCHAR(66),
      transferred_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fraud_alerts (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token_id   INTEGER,
      reason     TEXT,
      confidence DECIMAL(5,2),
      status     VARCHAR(20) DEFAULT 'open',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_land_owner ON land_parcels(owner_wallet);
    CREATE INDEX IF NOT EXISTS idx_transfer_token ON transfer_requests(token_id);
    CREATE INDEX IF NOT EXISTS idx_history_token ON ownership_history(token_id);
  `);
  console.log("Database migrations complete");
};

const query = (text, params) => pool.query(text, params);

module.exports = { connectDB, query };
