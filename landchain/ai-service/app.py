# ai-service/app.py
# FREE AI microservice deployed on Render.com (free tier)
#
# Install:
#   pip install flask flask-cors pytesseract Pillow scikit-learn
#               numpy requests transformers torch
#
# Run locally: python app.py
# Deploy free: push to GitHub → connect to Render.com → free web service

from flask import Flask, request, jsonify
import pytesseract
from PIL import Image
import numpy as np
import io, os, requests, json, re
from sklearn.ensemble import IsolationForest

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB

AI_SHARED_SECRET = os.getenv("AI_SHARED_SECRET", "landchain-secret")
BACKEND_URL      = os.getenv("BACKEND_URL", "http://localhost:5000")

# ── Module 1: Document Verification AI ─────────────────────────────────────
def verify_document_ocr(image_bytes: bytes) -> dict:
    """
    OCR-based document verification.
    Checks for required fields in land documents.
    FREE: pytesseract + Pillow (both open source)
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        text  = pytesseract.image_to_string(image, lang="eng+hin")

        # Required fields in a valid Indian land deed
        required_keywords = [
            "survey", "revenue", "khasra", "khata",
            "district", "taluka", "area", "owner"
        ]

        text_lower = text.lower()
        found = [kw for kw in required_keywords if kw in text_lower]
        confidence = len(found) / len(required_keywords) * 100

        # Check for government seal indicators
        has_seal = any(word in text_lower for word in [
            "government", "registrar", "sub-registrar", "official"
        ])

        # Simple forgery check: look for common editing artifacts
        forgery_indicators = [
            len(re.findall(r'\bXXX\b', text)) > 0,
            len(re.findall(r'[^\x00-\x7F]{10,}', text)) > 5,  # excessive non-ASCII blocks
        ]
        forgery_risk = any(forgery_indicators)

        return {
            "confidence": round(confidence, 2),
            "extracted_text": text[:500],  # first 500 chars
            "keywords_found": found,
            "has_official_seal": has_seal,
            "forgery_risk": forgery_risk,
            "verified": confidence >= 60 and not forgery_risk
        }
    except Exception as e:
        return {"error": str(e), "verified": False, "confidence": 0}


# ── Module 2: Fraud Detection AI ────────────────────────────────────────────
# Simple anomaly detection using Isolation Forest
# In production, train on real transaction history

fraud_model = IsolationForest(contamination=0.05, random_state=42)
_model_trained = False

def detect_fraud(transaction_features: list) -> dict:
    """
    Anomaly detection on transfer patterns.
    Features: [days_since_last_transfer, price_change_pct, num_transfers_30d, ...]
    """
    global _model_trained
    X = np.array([transaction_features])

    if not _model_trained:
        # In prod: load pre-trained model or train on historical data
        # Here: dummy training for demo
        dummy_data = np.random.rand(100, len(transaction_features))
        fraud_model.fit(dummy_data)
        _model_trained = True

    score = fraud_model.decision_function(X)[0]
    prediction = fraud_model.predict(X)[0]

    # Specific rule-based fraud checks
    flags = []
    if transaction_features[0] < 7:   # sold within 7 days of purchase
        flags.append("Rapid resale (< 7 days)")
    if transaction_features[1] > 200:  # price jumped > 200%
        flags.append("Unusual price spike")
    if transaction_features[2] > 3:   # > 3 transfers in 30 days
        flags.append("High transfer frequency")

    is_fraud = prediction == -1 or len(flags) > 0
    return {
        "fraud_detected": is_fraud,
        "anomaly_score": round(float(score), 4),
        "confidence": round(abs(float(score)) * 100, 2),
        "flags": flags
    }


# ── Module 3: Land Valuation AI ─────────────────────────────────────────────
def estimate_land_value(location: str, area_sqft: int, nearby_amenities: list) -> dict:
    """
    Simple regression-based land valuation.
    FREE: scikit-learn (no paid APIs needed)
    In production: train on real property data from data.gov.in
    """
    # Base price per sqft by city tier (INR)
    city_tiers = {
        "mumbai": 80000, "delhi": 70000, "bangalore": 60000,
        "hyderabad": 40000, "pune": 35000, "bhopal": 8000,
        "indore": 12000, "default": 5000
    }

    city_lower = location.lower()
    base_price = next(
        (v for k, v in city_tiers.items() if k in city_lower),
        city_tiers["default"]
    )

    # Amenity multipliers
    multiplier = 1.0
    amenity_boosts = {
        "school": 0.05, "hospital": 0.08, "metro": 0.12,
        "market": 0.06, "highway": 0.10, "park": 0.04
    }
    for amenity in nearby_amenities:
        multiplier += amenity_boosts.get(amenity.lower(), 0.02)

    estimated_value = area_sqft * base_price * multiplier
    # Add ±15% confidence range
    low  = estimated_value * 0.85
    high = estimated_value * 1.15

    return {
        "estimated_value_inr": round(estimated_value),
        "range_low_inr":       round(low),
        "range_high_inr":      round(high),
        "price_per_sqft":      round(base_price * multiplier),
        "confidence_pct":      75
    }


# ── API Endpoints ────────────────────────────────────────────────────────────

@app.route("/api/verify-documents", methods=["POST"])
def verify_documents():
    """
    Called by backend after seller uploads documents.
    Fetches from IPFS, runs OCR verification, calls back to backend.
    """
    data        = request.json
    token_id    = data.get("tokenId")
    ipfs_cid    = data.get("ipfsCid")
    transfer_id = data.get("transferId")

    try:
        # Fetch document from IPFS (free public gateway)
        ipfs_url = f"https://w3s.link/ipfs/{ipfs_cid}"
        response = requests.get(ipfs_url, timeout=30)

        result = verify_document_ocr(response.content)
        verified   = result["verified"]
        confidence = result["confidence"]

        # Check fraud patterns (dummy features for demo)
        features = [30, 50, 1, 1000000]  # days_since_purchase, price_change_pct, transfers_30d, area
        fraud    = detect_fraud(features)

        # Callback to backend
        callback_url = f"{BACKEND_URL}/api/transfer/ai-callback"
        requests.post(callback_url, json={
            "transferId":    transfer_id,
            "tokenId":       token_id,
            "verified":      verified,
            "confidence":    confidence,
            "fraudDetected": fraud["fraud_detected"],
            "fraudReason":   ", ".join(fraud["flags"]) if fraud["flags"] else None
        }, headers={"x-ai-secret": AI_SHARED_SECRET}, timeout=10)

        return jsonify({"success": True, "result": result, "fraud": fraud})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/valuation", methods=["POST"])
def valuation():
    data = request.json
    result = estimate_land_value(
        data.get("location", ""),
        data.get("areaSqft", 1000),
        data.get("nearbyAmenities", [])
    )
    return jsonify(result)


@app.route("/api/fraud-check", methods=["POST"])
def fraud_check():
    data     = request.json
    features = data.get("features", [30, 0, 1, 1000])
    result   = detect_fraud(features)
    return jsonify(result)


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "LandChain AI Microservice"})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)
