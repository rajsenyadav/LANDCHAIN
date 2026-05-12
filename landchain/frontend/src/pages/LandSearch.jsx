// frontend/src/pages/LandSearch.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function LandSearch() {
  const [q, setQ]           = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/land/search?query=${encodeURIComponent(q)}`
      );
      setResults(await res.json());
    } catch { alert("Search failed. Is the backend running?"); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Search Land Records</h1>
      <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        <input value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder="Search by location, survey number, or owner..."
          style={{ flex: 1, padding: "12px 16px", borderRadius: 8,
                   border: "1px solid #d1d5db", fontSize: 14 }} />
        <button onClick={search} disabled={loading}
          style={{ padding: "12px 24px", background: "#1d4ed8", color: "#fff",
                   border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
          {loading ? "..." : "Search"}
        </button>
      </div>

      {results.map(p => (
        <Link to={`/land/${p.token_id}`} key={p.token_id}
          style={{ display: "block", background: "#fff", border: "1px solid #e5e7eb",
                   borderRadius: 10, padding: "16px 20px", marginBottom: 12,
                   textDecoration: "none", color: "inherit" }}>
          <div style={{ fontWeight: 600 }}>#{p.token_id} — Survey {p.survey_number}</div>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            {p.location} · {p.area_sqft?.toLocaleString()} sqft · Owner: {p.owner_wallet?.slice(0,8)}...
          </div>
          {p.fraud_flag && (
            <span style={{ background: "#fee2e2", color: "#991b1b", fontSize: 11,
                           padding: "2px 8px", borderRadius: 10, marginTop: 6, display: "inline-block" }}>
              Fraud Alert
            </span>
          )}
        </Link>
      ))}

      {!loading && results.length === 0 && q && (
        <p style={{ textAlign: "center", color: "#6b7280" }}>No results found for "{q}"</p>
      )}
    </div>
  );
}
