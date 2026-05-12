# LANDCHAIN
It is Blockchain based transaction tool in which land transaction is done by obeying 6 terms and condition if it met it will automatically sell the land to second party without any third party  and creates immutable digital signature , Motive : To Reduce Land Related Frauds   .

# LandChain AI
**Blockchain-Powered Land Registry & Ownership Transfer System**

Built by Raj | VIT Bhopal University | 2026

---

## What is this?
LandChain AI is a full-stack web application that revolutionizes land ownership using:
- **Blockchain** (Ethereum) — each land parcel is a unique NFT; records are immutable
- **Smart Contracts** (Solidity) — transfer only executes when ALL 6 conditions are met
- **AI** (Python) — verifies documents, detects fraud, estimates land value
- **IPFS** — decentralized tamper-proof document storage

## Free Tech Stack
| Component | Free Service |
|-----------|-------------|
| Smart Contracts | Hardhat + Ethereum Sepolia testnet |
| Blockchain RPC | Alchemy.com (free tier) |
| Frontend | React + Vite → Vercel (free) |
| Backend | Node.js + Express → Railway.app (free) |
| Database | PostgreSQL → Supabase (free 500 MB) |
| File Storage | IPFS → web3.storage (free 5 GB) |
| AI Service | Python + Flask → Render.com (free) |

## Quick Start

### 1. Clone and setup
```bash
git clone <your-repo>
cd landchain
```

### 2. Blockchain
```bash
cd blockchain
npm install
cp .env.example .env   # fill in your keys
npx hardhat compile
npx hardhat test       # all 5 tests should pass
npx hardhat node       # start local chain
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc.
npm run dev            # runs on port 5000
```

### 4. AI Service
```bash
cd ai-service
pip install -r requirements.txt
python app.py          # runs on port 8000
```

### 5. Frontend
```bash
cd frontend
npm install
cp .env.example .env   # fill in VITE_API_URL, etc.
npm run dev            # runs on port 3000
```

Open http://localhost:3000 — connect MetaMask on Sepolia testnet.

## Project Structure
```
landchain/
├── blockchain/          # Solidity + Hardhat
│   ├── contracts/       # LandRegistry.sol
│   ├── scripts/         # deploy.js
│   └── test/            # LandRegistry.test.js
├── backend/             # Node.js + Express
│   └── src/
│       ├── routes/      # auth, land, transfer, ai, kyc
│       ├── models/      # PostgreSQL (db.js)
│       └── middleware/  # JWT auth, error handler
├── frontend/            # React + Vite
│   └── src/
│       └── pages/       # Dashboard, Search, Detail, Transfer, Registrar, Valuation
└── ai-service/          # Python + Flask
    └── app.py           # OCR, Fraud Detection, Valuation APIs
```

## Key Features
- ERC-721 NFT per land parcel — absolute uniqueness, one true owner
- 6-condition smart contract escrow — auto-executes only when all met
- AI document verification with OCR (pytesseract)
- AI fraud detection (scikit-learn IsolationForest)
- AI land valuation (regression model)
- Web3 wallet login (MetaMask signature — no passwords)
- Role-based access (citizen / registrar / admin / court)
- Full ownership history on blockchain (legal evidence)
- IPFS decentralized document storage

## Smart Contract Address (Sepolia Testnet)
After deployment, add your address here: `0x...`

## License
MIT — free to use and modify.

