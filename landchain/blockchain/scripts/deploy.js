// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying LandRegistry to", network.name, "...");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  const LandRegistry = await ethers.getContractFactory("LandRegistry");
  const contract = await LandRegistry.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\nLandRegistry deployed at:", address);
  console.log("Save this address in your .env as CONTRACT_ADDRESS=", address);

  // Grant REGISTRAR_ROLE to backend wallet (optional at deploy time)
  // const REGISTRAR_ROLE = await contract.REGISTRAR_ROLE();
  // await contract.grantRole(REGISTRAR_ROLE, process.env.BACKEND_WALLET);

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nVerifying on Etherscan (wait 30s for propagation)...");
    await new Promise(r => setTimeout(r, 30000));
    try {
      await hre.run("verify:verify", { address, constructorArguments: [] });
      console.log("Contract verified on Etherscan!");
    } catch (e) {
      console.log("Verification error (may already be verified):", e.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
