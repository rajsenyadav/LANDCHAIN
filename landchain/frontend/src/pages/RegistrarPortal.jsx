// frontend/src/pages/RegistrarPortal.jsx
import React, { useEffect, useState } from "react";
import { useWeb3 } from "../App";

export default function RegistrarPortal() {
  const { apiCall, user } = useWeb3();
  const [pendingTransfers, setPending] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadPending(); }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await apiCall("/api/transfer/pending");
      setPending(data || []);
    } catch {}
    setLoading(false);
  };

  const approve = async (tokenId) => {
    try {
      await apiCall(`/api/transfer/${tokenId}/approve`, { method: "POST" });
      alert("Transfer approved! Smart contract executing...");
      loadPending();
    } catch (e) { alert(e.message); }
  };

  const cancel = async (tokenId) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await apiCall(`/api/transfer/${tokenId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason })
      });
      alert("Transfer cancelled. Buyer will be refunded from escrow.");
      loadPending();
    } catch (e) { alert(e.message); }
  };

  if (user?.role !== "registrar" && user?.role !== "admin") {
    return <div style={{ padding: 40, textAlign: "center" }}>Access denied. Registrar role required.</div>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: "40px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Registrar Portal</h1>
      <p style={{ color: "#6b7280", marginBottom: 32 }}>
        Review pending transfers. Your approval is the final condition for smart contract execution.
      </p>

      {loading && <p>Loading pending transfers...</p>}

      {pendingTransfers.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: 48, background: "#f8fafc", borderRadius: 12 }}>
          <p style={{ color: "#6b7280" }}>No pending transfers awaiting review.</p>
        </div>
      )}

      {pendingTransfers.map(t => (
        <div key={t.id} style={{ background: "#fff", border: "1px solid #e5e7eb",
                                  borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Token #{t.token_id}</div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
                {t.seller_wallet?.slice(0,8)}... → {t.buyer_wallet?.slice(0,8)}...
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 600 }}>
                {(Number(t.sale_price_wei) / 1e18).toFixed(4)} ETH
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {new Date(t.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Condition checklist */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
            {[
              { label: "KYC Verified",       done: t.kyc_verified },
              { label: "AI Doc Verified",    done: t.ai_verified },
              { label: "Buyer Paid",         done: t.buyer_paid },
              { label: "Seller Signed",      done: t.seller_signed },
              { label: "Buyer Signed",       done: t.buyer_signed },
              { label: "Registrar Approval", done: t.registrar_approved },
            ].map(c => (
              <div key={c.label} style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 13,
                color: c.done ? "#166534" : "#6b7280"
              }}>
                <span>{c.done ? "✓" : "○"}</span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>

          {!t.registrar_approved && !t.executed && (
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => approve(t.token_id)}
                style={{ padding: "10px 24px", background: "#16a34a", color: "#fff",
                         border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                Approve Transfer
              </button>
              <button onClick={() => cancel(t.token_id)}
                style={{ padding: "10px 24px", background: "#dc2626", color: "#fff",
                         border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                Reject & Refund
              </button>
            </div>
          )}

          {t.executed && (
            <div style={{ background: "#dcfce7", color: "#166534", padding: "8px 16px",
                          borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
              Transfer completed on blockchain. NFT transferred to buyer.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
