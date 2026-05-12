// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * LandChain AI - Land Registry Smart Contract
 * Each land parcel is minted as an ERC-721 NFT (unique, non-duplicable)
 * Transfers only execute when ALL conditions are met (escrow model)
 *
 * Free deployment: Ethereum Sepolia testnet via Hardhat + Alchemy (free tier)
 */
contract LandRegistry is ERC721URIStorage, AccessControl {
    using Counters for Counters.Counter;

    // ── Roles ──────────────────────────────────────────────────────────────
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant ADMIN_ROLE     = keccak256("ADMIN_ROLE");

    // ── State ──────────────────────────────────────────────────────────────
    Counters.Counter private _tokenIds;

    struct LandParcel {
        uint256 tokenId;
        string  surveyNumber;   // Govt survey number
        string  ipfsDocHash;    // IPFS CID of documents
        string  location;       // e.g. "Bhopal, MP"
        uint256 areaSqft;
        uint256 registeredAt;
        bool    isListed;       // available for transfer
        bool    fraudFlag;      // AI fraud detection flag
    }

    struct TransferRequest {
        uint256 tokenId;
        address seller;
        address buyer;
        uint256 salePrice;      // in wei
        bool    aiVerified;     // AI doc check passed
        bool    kycVerified;    // KYC for both parties
        bool    buyerPaid;      // payment in escrow
        bool    sellerSigned;
        bool    buyerSigned;
        bool    registrarApproved;
        bool    executed;
        uint256 escrowAmount;   // ETH held in contract
        uint256 createdAt;
    }

    mapping(uint256 => LandParcel)      public parcels;
    mapping(uint256 => TransferRequest) public transfers; // tokenId => active transfer
    mapping(address => bool)            public kycApproved;
    mapping(string => bool)             private surveyExists; // prevent duplicates

    // ── Events ─────────────────────────────────────────────────────────────
    event LandMinted(uint256 indexed tokenId, address owner, string surveyNumber);
    event TransferInitiated(uint256 indexed tokenId, address seller, address buyer, uint256 price);
    event ConditionMet(uint256 indexed tokenId, string condition);
    event TransferExecuted(uint256 indexed tokenId, address from, address to, uint256 price);
    event FraudFlagged(uint256 indexed tokenId, string reason);
    event EscrowRefunded(uint256 indexed tokenId, address buyer, uint256 amount);

    constructor() ERC721("LandChain AI", "LAND") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE,         msg.sender);
        _grantRole(REGISTRAR_ROLE,     msg.sender);
    }

    // ── STEP 1: Mint land parcel as NFT ───────────────────────────────────
    function mintLand(
        address  owner,
        string   memory surveyNumber,
        string   memory ipfsDocHash,
        string   memory location,
        uint256  areaSqft,
        string   memory tokenURI_
    ) external onlyRole(REGISTRAR_ROLE) returns (uint256) {
        require(!surveyExists[surveyNumber], "Survey number already registered");

        _tokenIds.increment();
        uint256 newId = _tokenIds.current();

        _safeMint(owner, newId);
        _setTokenURI(newId, tokenURI_);

        parcels[newId] = LandParcel({
            tokenId:       newId,
            surveyNumber:  surveyNumber,
            ipfsDocHash:   ipfsDocHash,
            location:      location,
            areaSqft:      areaSqft,
            registeredAt:  block.timestamp,
            isListed:      false,
            fraudFlag:     false
        });

        surveyExists[surveyNumber] = true;
        emit LandMinted(newId, owner, surveyNumber);
        return newId;
    }

    // ── STEP 2: Seller lists land, locks NFT in contract (escrow) ─────────
    function initiateSale(uint256 tokenId, address buyer, uint256 priceWei) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(!parcels[tokenId].fraudFlag,    "Land has active fraud flag");
        require(!parcels[tokenId].isListed,     "Already listed");
        require(kycApproved[msg.sender],        "Seller KYC not verified");
        require(kycApproved[buyer],             "Buyer KYC not verified");

        // Lock NFT in this contract (escrow)
        _transfer(msg.sender, address(this), tokenId);
        parcels[tokenId].isListed = true;

        transfers[tokenId] = TransferRequest({
            tokenId:           tokenId,
            seller:            msg.sender,
            buyer:             buyer,
            salePrice:         priceWei,
            aiVerified:        false,
            kycVerified:       true,   // checked above
            buyerPaid:         false,
            sellerSigned:      false,
            buyerSigned:       false,
            registrarApproved: false,
            executed:          false,
            escrowAmount:      0,
            createdAt:         block.timestamp
        });

        emit TransferInitiated(tokenId, msg.sender, buyer, priceWei);
    }

    // ── STEP 5: Buyer deposits payment into escrow ─────────────────────────
    function depositPayment(uint256 tokenId) external payable {
        TransferRequest storage t = transfers[tokenId];
        require(msg.sender == t.buyer,           "Not the buyer");
        require(!t.buyerPaid,                    "Already paid");
        require(msg.value == t.salePrice,        "Incorrect payment amount");

        t.buyerPaid      = true;
        t.escrowAmount   = msg.value;
        emit ConditionMet(tokenId, "BUYER_PAID");
    }

    // ── AI Backend calls this after document verification ─────────────────
    function setAIVerified(uint256 tokenId, bool verified)
        external onlyRole(REGISTRAR_ROLE)
    {
        transfers[tokenId].aiVerified = verified;
        if (verified) emit ConditionMet(tokenId, "AI_VERIFIED");
        _tryExecute(tokenId);
    }

    // ── STEP 6: Digital signatures from both parties ───────────────────────
    function signAsSellerOrBuyer(uint256 tokenId) external {
        TransferRequest storage t = transfers[tokenId];
        if (msg.sender == t.seller) {
            t.sellerSigned = true;
            emit ConditionMet(tokenId, "SELLER_SIGNED");
        } else if (msg.sender == t.buyer) {
            t.buyerSigned = true;
            emit ConditionMet(tokenId, "BUYER_SIGNED");
        } else {
            revert("Not a party to this transfer");
        }
        _tryExecute(tokenId);
    }

    // ── STEP 7: Registrar gives final approval ─────────────────────────────
    function registrarApprove(uint256 tokenId) external onlyRole(REGISTRAR_ROLE) {
        transfers[tokenId].registrarApproved = true;
        emit ConditionMet(tokenId, "REGISTRAR_APPROVED");
        _tryExecute(tokenId);
    }

    // ── STEP 8: Auto-execute when ALL conditions are TRUE ─────────────────
    function _tryExecute(uint256 tokenId) internal {
        TransferRequest storage t = transfers[tokenId];
        if (t.executed) return;

        bool allMet = t.aiVerified
                   && t.kycVerified
                   && t.buyerPaid
                   && t.sellerSigned
                   && t.buyerSigned
                   && t.registrarApproved
                   && !parcels[tokenId].fraudFlag;

        if (allMet) {
            t.executed = true;
            parcels[tokenId].isListed = false;
            parcels[tokenId].ipfsDocHash = ""; // will be updated by backend

            // Transfer NFT to buyer
            _transfer(address(this), t.buyer, tokenId);

            // Release payment to seller
            uint256 amount = t.escrowAmount;
            t.escrowAmount = 0;
            (bool sent, ) = payable(t.seller).call{value: amount}("");
            require(sent, "Payment transfer failed");

            emit TransferExecuted(tokenId, t.seller, t.buyer, amount);
        }
    }

    // ── Fraud flag (AI fraud detection calls backend → backend calls this) ─
    function flagFraud(uint256 tokenId, string memory reason)
        external onlyRole(REGISTRAR_ROLE)
    {
        parcels[tokenId].fraudFlag = true;
        emit FraudFlagged(tokenId, reason);
    }

    // ── Cancel & refund if registrar rejects ─────────────────────────────
    function cancelTransfer(uint256 tokenId) external onlyRole(REGISTRAR_ROLE) {
        TransferRequest storage t = transfers[tokenId];
        require(!t.executed, "Already executed");

        parcels[tokenId].isListed = false;
        _transfer(address(this), t.seller, tokenId);

        if (t.escrowAmount > 0) {
            uint256 refund = t.escrowAmount;
            t.escrowAmount = 0;
            (bool sent, ) = payable(t.buyer).call{value: refund}("");
            require(sent, "Refund failed");
            emit EscrowRefunded(tokenId, t.buyer, refund);
        }
    }

    // ── KYC approval (called by backend after Aadhaar verification) ───────
    function approveKYC(address user) external onlyRole(REGISTRAR_ROLE) {
        kycApproved[user] = true;
    }

    // ── View helpers ───────────────────────────────────────────────────────
    function getParcel(uint256 tokenId) external view returns (LandParcel memory) {
        return parcels[tokenId];
    }

    function getTransfer(uint256 tokenId) external view returns (TransferRequest memory) {
        return transfers[tokenId];
    }

    function totalParcels() external view returns (uint256) {
        return _tokenIds.current();
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721URIStorage, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
