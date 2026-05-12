// frontend/src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../App";

export default function Login() {
  const { account, connectWallet, login } = useWeb3();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleConnect = async () => {
    setLoading(true);
    try {
      const wallet = await connectWallet();
      if (wallet) {
        await login(wallet);
        navigate("/");
      }
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 440, margin: "100px auto", padding: "0 24px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Login to LandChain AI</h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
        No password needed. Sign a message with your MetaMask wallet to prove ownership.
        No gas fee for signing.
      </p>
      <button onClick={handleConnect} disabled={loading}
        style={{ width: "100%", padding: "14px 24px", background: "#1d4ed8", color: "#fff",
                 border: "none", borderRadius: 10, cursor: "pointer", fontSize: 16, fontWeight: 600 }}>
        {loading ? "Connecting..." : account ? "Sign & Login" : "Connect MetaMask"}
      </button>
      <p style={{ marginTop: 16, fontSize: 12, color: "#9ca3af" }}>
        Don't have MetaMask? Install free at <a href="https://metamask.io" target="_blank" rel="noreferrer"
        style={{ color: "#2563eb" }}>metamask.io</a>
      </p>
    </div>
  );
}
