// frontend/src/pages/LandDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useWeb3 } from "../App";

export default function LandDetail() {
  const { id } = useParams();
  const { account, apiCall } = useWeb3();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadParcel(); }, [id]);

  const loadParcel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/land/${id}`);
      setData(await res.json());
    } catch {}
    setLoading(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading parcel details...</div>;
  if (!data)   return <div style={{ padding: 40, textAlign: "center" }}>Parcel not found.</div>;

  const { parcel, history } = data;
  const isOwner = account?.toLowerCase() === parcel.owner_wallet?.toLowerCase();

  return (
    <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Token #{parcel.token_id}</h1>
            {parcel.fraud_flag && (
              <span style={{ background: "#fee2e2", color: "#991b1b", fontSize: 12,
                             padding: "3px 10px", borderRadius: 20 }}>Fraud Alert</span>
            )}
            {parcel.is_listed && (
              <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 12,
                             padding: "3px 10px", borderRadius: 20 }}>Listed for Sale</span>
            )}
          </div>
          <p style={{ color: "#6b7280", fontSize: 14 }}>Survey No: {parcel.survey_number}</p>
        </div>
        {isOwner && !parcel.is_listed && (
          <Link to={`/transfer/${parcel.token_id}`}
            style={{ background: "#1d4ed8", color: "#fff", padding: "10px 20px",
                     borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
            List for Transfer
          </Link>
        )}
      </div>

      {/* Details Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Location",     value: parcel.location },
          { label: "Area",         value: `${parcel.area_sqft?.toLocaleString()} sqft` },
          { label: "Current Owner",value: parcel.owner_wallet },
          { label: "Registered",   value: new Date(parcel.registered_at).toLocaleDateString("en-IN") },
          { label: "IPFS Docs",    value: parcel.ipfs_doc_cid ? `ipfs://${parcel.ipfs_doc_cid.slice(0,20)}...` : "N/A" },
          { label: "Owner Name",   value: parcel.owner_name || "Not provided" },
        ].map(f => (
          <div key={f.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 14, fontWeight: 500, wordBreak: "break-all" }}>{f.value}</div>
          </div>
        ))}
      </div>

      {/* IPFS Documents Link */}
      {parcel.ipfs_doc_cid && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10,
                      padding: "14px 18px", marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: "#1e40af", fontWeight: 500, marginBottom: 4 }}>
            View Documents on IPFS (tamper-proof)
          </div>
          <a href={`https://w3s.link/ipfs/${parcel.ipfs_doc_cid}`} target="_blank" rel="noreferrer"
             style={{ fontSize: 13, color: "#2563eb" }}>
            https://w3s.link/ipfs/{parcel.ipfs_doc_cid}
          </a>
        </div>
      )}

      {/* Ownership History */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Ownership History</h2>
      <div style={{ borderLeft: "2px solid #e5e7eb", paddingLeft: 24 }}>
        {history.length === 0 && (
          <p style={{ color: "#6b7280", fontSize: 14 }}>No transfer history yet.</p>
        )}
        {history.map((h, i) => (
          <div key={h.id} style={{ marginBottom: 20, position: "relative" }}>
            <div style={{
              position: "absolute", left: -31, top: 4,
              width: 12, height: 12, borderRadius: "50%",
              background: i === 0 ? "#1d4ed8" : "#d1d5db"
            }} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {h.from_wallet ? `${h.from_wallet.slice(0,8)}... → ${h.to_wallet.slice(0,8)}...` : `Registered to ${h.to_wallet.slice(0,8)}...`}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {new Date(h.transferred_at).toLocaleString("en-IN")}
              {h.sale_price_wei && ` · ${(Number(h.sale_price_wei)/1e18).toFixed(4)} ETH`}
            </div>
            {h.tx_hash && (
              <a href={`https://sepolia.etherscan.io/tx/${h.tx_hash}`} target="_blank" rel="noreferrer"
                 style={{ fontSize: 11, color: "#2563eb" }}>
                View on Etherscan →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
