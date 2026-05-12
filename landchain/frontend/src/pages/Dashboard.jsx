// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../App";

export default function Dashboard() {
  const { account, user, connectWallet, apiCall } = useWeb3();
  const [parcels,   setParcels]   = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    if (account) loadData();
  }, [account]);

  const loadData = async () => {
    setLoading(true);
    try {
      const results = await apiCall(`/api/land/search?owner=${account}`);
      setParcels(results);
    } catch {}
    setLoading(false);
  };

  if (!account) {
    return (
      <div style={{ maxWidth: 800, margin: "80px auto", textAlign: "center", padding: "0 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          LandChain AI
        </h1>
        <p style={{ color: "#6b7280", fontSize: 18, marginBottom: 32 }}>
          Blockchain-powered land registry. Tamper-proof. Transparent. Automated.
        </p>
        <button onClick={connectWallet}
          style={{ background: "#1d4ed8", color: "#fff", border: "none",
                   padding: "14px 32px", borderRadius: 10, cursor: "pointer",
                   fontSize: 16, fontWeight: 600 }}>
          Connect MetaMask to Get Started
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 64 }}>
          {[
            { icon: "🏛️", title: "NFT Land Tokens", desc: "Each parcel is a unique ERC-721 NFT. One token = one owner. No duplicates." },
            { icon: "🤖", title: "AI Verification",  desc: "Documents verified by OCR + ML. Fraud detected automatically." },
            { icon: "⚡", title: "Smart Contracts",  desc: "Auto-execute transfers only when ALL conditions are met. No middlemen." }
          ].map(f => (
            <div key={f.title} style={{ background: "#f8fafc", borderRadius: 12, padding: 24, textAlign: "left" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>My Dashboard</h1>
          <p style={{ color: "#6b7280", fontSize: 14 }}>
            Wallet: {account} · Role: {user?.role || "citizen"} · KYC: {user?.kyc_status || "pending"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/search"
            style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #d1d5db",
                     textDecoration: "none", color: "#374151", fontSize: 14 }}>
            Search Land
          </Link>
          {user?.role === "registrar" &&
            <Link to="/register"
              style={{ padding: "10px 20px", borderRadius: 8, background: "#1d4ed8",
                       textDecoration: "none", color: "#fff", fontSize: 14 }}>
              + Register Parcel
            </Link>
          }
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "My Parcels",      value: parcels.length },
          { label: "Listed for Sale", value: parcels.filter(p => p.is_listed).length },
          { label: "Fraud Flagged",   value: parcels.filter(p => p.fraud_flag).length },
          { label: "Total Transfers", value: transfers.length }
        ].map(s => (
          <div key={s.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Land Parcels */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>My Land Parcels</h2>
      {loading ? <p>Loading...</p> : parcels.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, background: "#f8fafc", borderRadius: 12 }}>
          <p style={{ color: "#6b7280" }}>No parcels registered yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {parcels.map(p => (
            <Link to={`/land/${p.token_id}`} key={p.token_id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                       background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
                       padding: "16px 20px", textDecoration: "none", color: "inherit" }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Token #{p.token_id} — {p.survey_number}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{p.location} · {p.area_sqft?.toLocaleString()} sqft</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {p.is_listed && <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 12, padding: "4px 10px", borderRadius: 20 }}>Listed</span>}
                {p.fraud_flag && <span style={{ background: "#fee2e2", color: "#991b1b", fontSize: 12, padding: "4px 10px", borderRadius: 20 }}>Fraud Alert</span>}
                <span style={{ background: "#dcfce7", color: "#166534", fontSize: 12, padding: "4px 10px", borderRadius: 20 }}>Verified</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
