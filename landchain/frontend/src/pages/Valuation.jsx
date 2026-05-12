// frontend/src/pages/Valuation.jsx
import React, { useState } from "react";

export default function Valuation() {
  const [form, setForm] = useState({
    location: "Bhopal, MP",
    areaSqft: 2000,
    nearbyAmenities: []
  });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const amenities = ["School","Hospital","Metro","Market","Highway","Park"];

  const toggleAmenity = (a) => {
    setForm(f => ({
      ...f,
      nearbyAmenities: f.nearbyAmenities.includes(a)
        ? f.nearbyAmenities.filter(x => x !== a)
        : [...f.nearbyAmenities, a]
    }));
  };

  const estimate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_AI_URL}/api/valuation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      setResult(await res.json());
    } catch { alert("AI service unavailable. Run the Python service locally."); }
    setLoading(false);
  };

  const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>AI Land Valuation</h1>
      <p style={{ color: "#6b7280", marginBottom: 32 }}>
        Enter property details to get an AI-estimated fair market value.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 6 }}>Location</label>
          <input value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8,
                     border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
            placeholder="e.g. Bhopal, MP" />
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 6 }}>
            Area: {form.areaSqft.toLocaleString()} sqft
          </label>
          <input type="range" min="100" max="50000" step="100" value={form.areaSqft}
            onChange={e => setForm(f => ({ ...f, areaSqft: parseInt(e.target.value) }))}
            style={{ width: "100%" }} />
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 10 }}>Nearby Amenities</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {amenities.map(a => (
              <button key={a} onClick={() => toggleAmenity(a)}
                style={{ padding: "6px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13,
                         background: form.nearbyAmenities.includes(a) ? "#1d4ed8" : "#f3f4f6",
                         color: form.nearbyAmenities.includes(a) ? "#fff" : "#374151",
                         border: "none" }}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <button onClick={estimate} disabled={loading}
          style={{ padding: "12px 24px", background: "#1d4ed8", color: "#fff",
                   border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          {loading ? "Estimating..." : "Get AI Valuation"}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 32, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#166534", marginBottom: 4 }}>Estimated Market Value</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#15803d" }}>
            {fmt(result.estimated_value_inr)}
          </div>
          <div style={{ color: "#4b5563", fontSize: 14, marginTop: 8 }}>
            Range: {fmt(result.range_low_inr)} – {fmt(result.range_high_inr)}
          </div>
          <div style={{ color: "#4b5563", fontSize: 14 }}>
            Rate: ₹{result.price_per_sqft?.toLocaleString()} per sqft · Confidence: {result.confidence_pct}%
          </div>
        </div>
      )}
    </div>
  );
}
