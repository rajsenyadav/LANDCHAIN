// hardhat.config.js  (blockchain/ directory root)
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * FREE deployment setup:
 *   - Alchemy free tier: https://alchemy.com  (get Sepolia RPC URL)
 *   - Sepolia faucet:   https://sepoliafaucet.com (free test ETH)
 *   - Etherscan:        https://etherscan.io (free API key for verification)
 *
 * Create .env with:
 *   ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
 *   PRIVATE_KEY=0x_your_metamask_private_key
 *   ETHERSCAN_API_KEY=your_etherscan_key
 */

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    // Local development (free, no internet needed)
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    // Free public testnet
    sepolia: {
      url: process.env.ALCHEMY_SEPOLIA_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || ""
  }
};
