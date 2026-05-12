// frontend/src/pages/RegisterLand.jsx
import React, { useState } from "react";
import { useWeb3 } from "../App";
import { useNavigate } from "react-router-dom";

export default function RegisterLand() {
  const { user, token } = useWeb3();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    ownerWallet:  "",
    surveyNumber: "",
    location:     "",
    areaSqft:     "",
  });
  const [files,   setFiles]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.ownerWallet || !form.surveyNumber || !form.location || !form.areaSqft) {
      return alert("Fill all fields");
    }
    if (files.length === 0) return alert("Upload at least one document");

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      files.forEach(f => fd.append("documents", f));

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/land/register`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  if (user?.role !== "registrar" && user?.role !== "admin") {
    return <div style={{ padding: 40, textAlign: "center" }}>Access denied. Registrar role required.</div>;
  }

  const inp = { padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db",
                fontSize: 14, width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ maxWidth: 680, margin: "40px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Register New Land Parcel</h1>
      <p style={{ color: "#6b7280", marginBottom: 32, fontSize: 14 }}>
        This mints a new ERC-721 NFT on the blockchain and uploads documents to IPFS.
      </p>

      {result ? (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#166534", marginBottom: 16 }}>
            Land Parcel Registered Successfully!
          </div>
          {[
            ["Token ID",    result.tokenId],
            ["Tx Hash",     result.txHash],
            ["IPFS CID",    result.ipfsCid],
            ["Token URI",   result.tokenURI],
          ].map(([k,v]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{k}</span>
              <div style={{ fontSize: 13, wordBreak: "break-all", fontFamily: "monospace" }}>{v}</div>
            </div>
          ))}
          <button onClick={() => navigate(`/land/${result.tokenId}`)}
            style={{ marginTop: 16, padding: "10px 24px", background: "#1d4ed8", color: "#fff",
                     border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
            View Parcel →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            { label: "Owner Wallet Address", key: "ownerWallet", placeholder: "0x..." },
            { label: "Survey Number",        key: "surveyNumber", placeholder: "e.g. MP-BPL-2024-001" },
            { label: "Location",             key: "location",     placeholder: "e.g. Bhopal, Madhya Pradesh" },
            { label: "Area (sqft)",          key: "areaSqft",     placeholder: "e.g. 2000", type: "number" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>{f.label}</label>
              <input style={inp} value={form[f.key]} onChange={set(f.key)}
                     placeholder={f.placeholder} type={f.type || "text"} />
            </div>
          ))}

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
              Upload Documents (PDF/JPG/PNG — max 10 MB each)
            </label>
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setFiles(Array.from(e.target.files))}
              style={{ fontSize: 13 }} />
            {files.length > 0 && (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                {files.map(f => f.name).join(", ")}
              </div>
            )}
          </div>

          <button onClick={submit} disabled={loading}
            style={{ padding: "12px 24px", background: loading ? "#9ca3af" : "#1d4ed8",
                     color: "#fff", border: "none", borderRadius: 8,
                     cursor: loading ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 600 }}>
            {loading ? "Minting NFT + Uploading to IPFS..." : "Register Land Parcel"}
          </button>

          <p style={{ fontSize: 12, color: "#9ca3af" }}>
            Documents are uploaded to IPFS (decentralized, tamper-proof). The NFT is minted on Ethereum Sepolia testnet.
          </p>
        </div>
      )}
    </div>
  );
}
