"""
Scam ML inference service.
Run: uvicorn app:app --host 0.0.0.0 --port 8000
"""
import os
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

MODEL_PATH = Path(os.getenv("ML_MODEL_PATH", "model.joblib"))
METADATA_PATH = Path(os.getenv("ML_METADATA_PATH", "metadata.json"))

model = None
metadata = {}
vectorizer = None


def load_model():
    global model, metadata, vectorizer
    if not MODEL_PATH.exists():
        return False
    import joblib
    data = joblib.load(MODEL_PATH)
    model = data.get("model")
    vectorizer = data.get("vectorizer")  # SentenceTransformer
    if METADATA_PATH.exists():
        with open(METADATA_PATH) as f:
            metadata = json.load(f)
    return model is not None


@app.on_event("startup")
def startup():
    load_model()


class PredictRequest(BaseModel):
    text: str


@app.post("/predict")
def predict(req: PredictRequest):
    text = (req.text or "").strip()[:5000]
    if not model:
        return {
            "scamProbability": 0.0,
            "confidence": 0.5,
            "labels": [],
            "modelVersion": "none"
        }
    try:
        import numpy as np
        emb = vectorizer.encode([text]) if hasattr(vectorizer, "encode") else None
        if emb is None:
            return {"scamProbability": 0.0, "confidence": 0.5, "labels": [], "modelVersion": metadata.get("version", "unknown")}
        proba = model.predict_proba(emb)[0]
        scam_idx = 1 if model.classes_[1] == "SCAM" else 0
        p = float(proba[scam_idx])
        return {
            "scamProbability": round(p, 4),
            "confidence": round(0.7 + 0.2 * abs(p - 0.5), 4),
            "labels": ["SCAM"] if p >= 0.5 else [],
            "modelVersion": metadata.get("version", "unknown")
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/health")
def health():
    return {"status": "ok", "modelLoaded": model is not None}
