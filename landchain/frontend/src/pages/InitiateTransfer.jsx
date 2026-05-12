// frontend/src/pages/InitiateTransfer.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWeb3 } from "../App";
import { ethers } from "ethers";

// Minimal ABI — only what we need on the frontend
const ABI = [
  "function initiateSale(uint256 tokenId, address buyer, uint256 priceWei) external",
  "function depositPayment(uint256 tokenId) external payable",
  "function signAsSellerOrBuyer(uint256 tokenId) external",
  "function getTransfer(uint256 tokenId) external view returns (tuple(uint256,address,address,uint256,bool,bool,bool,bool,bool,bool,bool,uint256,uint256))",
];

export default function InitiateTransfer() {
  const { tokenId } = useParams();
  const navigate    = useNavigate();
  const { provider, account, apiCall } = useWeb3();
  const [parcel,   setParcel]   = useState(null);
  const [form,     setForm]     = useState({ buyerWallet: "", salePriceEth: "" });
  const [transfer, setTransfer] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState("init"); // init | initiated | sign

  useEffect(() => { loadParcel(); }, [tokenId]);

  const loadParcel = async () => {
    try {
      const data = await fetch(`${import.meta.env.VITE_API_URL}/api/land/${tokenId}`).then(r => r.json());
      setParcel(data.parcel);
    } catch {}
  };

  const getContract = async () => {
    const signer = await provider.getSigner();
    return new ethers.Contract(import.meta.env.VITE_CONTRACT_ADDRESS, ABI, signer);
  };

  // Step 1: Seller initiates (backend records it)
  const initiateSale = async () => {
    if (!form.buyerWallet || !form.salePriceEth) return alert("Fill all fields");
    setLoading(true);
    try {
      await apiCall("/api/transfer/initiate", {
        method: "POST",
        body: JSON.stringify({ tokenId: parseInt(tokenId), buyerWallet: form.buyerWallet, salePriceEth: parseFloat(form.salePriceEth) })
      });
      setStep("initiated");
      alert("Transfer initiated! AI verification has started. You can now sign the transaction.");
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  // Step 2: Sign with MetaMask (on-chain)
  const signTransaction = async () => {
    setLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.signAsSellerOrBuyer(tokenId);
      await tx.wait();
      alert("Signed successfully! Tx: " + tx.hash);
      setStep("sign");
    } catch (e) { alert(e.message || "MetaMask rejected"); }
    setLoading(false);
  };

  const inp = { padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Initiate Transfer</h1>
      {parcel && (
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 18px", marginBottom: 28 }}>
          <div style={{ fontWeight: 500 }}>Token #{parcel.token_id} — {parcel.survey_number}</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{parcel.location} · {parcel.area_sqft?.toLocaleString()} sqft</div>
        </div>
      )}

      {step === "init" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>Buyer Wallet Address</label>
            <input style={inp} value={form.buyerWallet} placeholder="0x..."
              onChange={e => setForm(f => ({ ...f, buyerWallet: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>Sale Price (ETH)</label>
            <input style={inp} value={form.salePriceEth} placeholder="e.g. 0.5" type="number" step="0.001"
              onChange={e => setForm(f => ({ ...f, salePriceEth: e.target.value }))} />
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              On Sepolia testnet — use test ETH only
            </p>
          </div>
          <div style={{ background: "#fef3c7", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#92400e" }}>
            Initiating a sale locks your NFT in the smart contract escrow. It will be returned to you if the transfer is cancelled.
          </div>
          <button onClick={initiateSale} disabled={loading}
            style={{ padding: "12px 24px", background: "#1d4ed8", color: "#fff",
                     border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
            {loading ? "Processing..." : "Initiate Sale"}
          </button>
        </div>
      )}

      {step === "initiated" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#dcfce7", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontWeight: 600, color: "#166534", marginBottom: 4 }}>Transfer Initiated!</div>
            <div style={{ fontSize: 13, color: "#166534" }}>AI verification is running. Sign your transaction below.</div>
          </div>
          <button onClick={signTransaction} disabled={loading}
            style={{ padding: "12px 24px", background: "#7c3aed", color: "#fff",
                     border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
            {loading ? "Waiting for MetaMask..." : "Sign Transaction (MetaMask)"}
          </button>
        </div>
      )}

      {step === "sign" && (
        <div style={{ background: "#dcfce7", borderRadius: 10, padding: "24px" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#166534", marginBottom: 8 }}>All Done!</div>
          <p style={{ fontSize: 14, color: "#166534" }}>
            You have signed. Waiting for buyer to sign and pay, then registrar approval.
            The smart contract will auto-execute when all 6 conditions are met.
          </p>
          <button onClick={() => navigate(`/land/${tokenId}`)}
            style={{ marginTop: 16, padding: "10px 20px", background: "#166534", color: "#fff",
                     border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
            Track Transfer Status →
          </button>
        </div>
      )}
    </div>
  );
}
