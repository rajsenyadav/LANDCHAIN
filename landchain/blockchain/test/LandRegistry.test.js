// blockchain/test/LandRegistry.test.js
const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("LandRegistry", function () {
  let contract, owner, registrar, seller, buyer;

  beforeEach(async () => {
    [owner, registrar, seller, buyer] = await ethers.getSigners();
    const LandRegistry = await ethers.getContractFactory("LandRegistry");
    contract = await LandRegistry.deploy();

    // Grant registrar role
    const REGISTRAR_ROLE = await contract.REGISTRAR_ROLE();
    await contract.grantRole(REGISTRAR_ROLE, registrar.address);

    // KYC approve both parties
    await contract.connect(registrar).approveKYC(seller.address);
    await contract.connect(registrar).approveKYC(buyer.address);
  });

  it("Should mint a land NFT", async () => {
    const tx = await contract.connect(registrar).mintLand(
      seller.address, "MP-BPL-001", "QmTestHash", "Bhopal, MP", 2000, "ipfs://tokenURI"
    );
    await tx.wait();
    expect(await contract.ownerOf(1)).to.equal(seller.address);

    const parcel = await contract.getParcel(1);
    expect(parcel.surveyNumber).to.equal("MP-BPL-001");
    expect(parcel.areaSqft).to.equal(2000n);
  });

  it("Should prevent duplicate survey numbers", async () => {
    await contract.connect(registrar).mintLand(
      seller.address, "MP-BPL-DUP", "QmHash", "Bhopal", 1000, "ipfs://uri"
    );
    await expect(
      contract.connect(registrar).mintLand(
        buyer.address, "MP-BPL-DUP", "QmHash2", "Bhopal", 2000, "ipfs://uri2"
      )
    ).to.be.revertedWith("Survey number already registered");
  });

  it("Should execute transfer when ALL conditions met", async () => {
    // 1. Mint land to seller
    await contract.connect(registrar).mintLand(
      seller.address, "MP-BPL-XFER", "QmHash", "Bhopal", 2000, "ipfs://uri"
    );
    const tokenId = 1;
    const priceWei = ethers.parseEther("1.0");

    // 2. Seller initiates sale (NFT goes into escrow)
    await contract.connect(seller).initiateSale(tokenId, buyer.address, priceWei);
    expect(await contract.ownerOf(tokenId)).to.equal(await contract.getAddress()); // in escrow

    // 3. Buyer deposits payment
    await contract.connect(buyer).depositPayment(tokenId, { value: priceWei });

    // 4. Seller signs
    await contract.connect(seller).signAsSellerOrBuyer(tokenId);

    // 5. Buyer signs
    await contract.connect(buyer).signAsSellerOrBuyer(tokenId);

    // 6. AI verified (by registrar/backend)
    await contract.connect(registrar).setAIVerified(tokenId, true);

    // 7. Registrar approves — this triggers auto-execution
    const sellerBalBefore = await ethers.provider.getBalance(seller.address);
    await contract.connect(registrar).registrarApprove(tokenId);

    // NFT should now be with buyer
    expect(await contract.ownerOf(tokenId)).to.equal(buyer.address);

    // Seller should have received payment
    const sellerBalAfter = await ethers.provider.getBalance(seller.address);
    expect(sellerBalAfter).to.be.greaterThan(sellerBalBefore);

    const xfer = await contract.getTransfer(tokenId);
    expect(xfer.executed).to.equal(true);
  });

  it("Should flag fraud and block transfer", async () => {
    await contract.connect(registrar).mintLand(
      seller.address, "MP-FRAUD-001", "QmHash", "Bhopal", 1000, "ipfs://uri"
    );
    const tokenId = 1;
    const price   = ethers.parseEther("0.5");

    await contract.connect(seller).initiateSale(tokenId, buyer.address, price);
    await contract.connect(registrar).flagFraud(tokenId, "Multiple claims detected");

    const parcel = await contract.getParcel(tokenId);
    expect(parcel.fraudFlag).to.equal(true);
  });

  it("Should cancel and refund buyer", async () => {
    await contract.connect(registrar).mintLand(
      seller.address, "MP-CANCEL-001", "QmHash", "Bhopal", 1000, "ipfs://uri"
    );
    const tokenId = 1;
    const price   = ethers.parseEther("0.5");

    await contract.connect(seller).initiateSale(tokenId, buyer.address, price);
    await contract.connect(buyer).depositPayment(tokenId, { value: price });

    const buyerBalBefore = await ethers.provider.getBalance(buyer.address);
    await contract.connect(registrar).cancelTransfer(tokenId);
    const buyerBalAfter = await ethers.provider.getBalance(buyer.address);

    expect(buyerBalAfter).to.be.greaterThan(buyerBalBefore); // refund received
    expect(await contract.ownerOf(tokenId)).to.equal(seller.address); // NFT back to seller
  });
});
