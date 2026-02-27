"""
Scam ML inference service. Run: uvicorn ml.service:app --host 0.0.0.0 --port 8000
POST /predict { "text": "...", "targetType": "JOB|MARKET" }
Output: { scamProbability, confidence, modelVersion, labels }
"""
import os
import json
import time
import logging
from pathlib import Path

from fastapi import FastAPI, Request
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scamML")

app = FastAPI()

ARTIFACTS = Path(__file__).resolve().parent / "artifacts"
MODEL_PATH = Path(os.getenv("ML_MODEL_PATH", str(ARTIFACTS / "model.joblib")))
METADATA_PATH = Path(os.getenv("ML_METADATA_PATH", str(ARTIFACTS / "metadata.json")))

model = None
metadata = {}
vectorizer = None


def load_model():
    global model, metadata, vectorizer
    if not MODEL_PATH.exists():
        logger.warning("Model not found: %s", MODEL_PATH)
        return False
    try:
        import joblib
        data = joblib.load(MODEL_PATH)
        model = data.get("model")
        vectorizer = data.get("vectorizer")
        if METADATA_PATH.exists():
            with open(METADATA_PATH) as f:
                metadata = json.load(f)
        logger.info("Model loaded: %s", metadata.get("version", "?"))
        return model is not None
    except Exception as e:
        logger.error("Load failed: %s", e)
        return False


@app.on_event("startup")
def startup():
    load_model()


class PredictRequest(BaseModel):
    text: str = ""
    targetType: str = "JOB"


@app.post("/predict")
def predict(req: Request, body: PredictRequest):
    start = time.time()
    text = (body.text or "").strip()[:5000]
    target = body.targetType or "JOB"
    logger.info("predict target=%s len=%d", target, len(text))

    if not model:
        return {"scamProbability": 0.0, "confidence": 0.5, "labels": [], "modelVersion": "none"}

    try:
        import numpy as np
        emb = vectorizer.encode([text]) if hasattr(vectorizer, "encode") else None
        if emb is None:
            return {"scamProbability": 0.0, "confidence": 0.5, "labels": [], "modelVersion": metadata.get("version", "?")}
        proba = model.predict_proba(emb)[0]
        scam_idx = 1 if (len(model.classes_) > 1 and model.classes_[1] == "SCAM") else 0
        p = float(proba[scam_idx])
        conf = min(1.0, 0.7 + 0.2 * abs(p - 0.5))
        out = {
            "scamProbability": round(p, 4),
            "confidence": round(conf, 4),
            "labels": ["SCAM"] if p >= 0.5 else [],
            "modelVersion": metadata.get("version", "unknown")
        }
        logger.info("predict done in %.0fms prob=%.2f", (time.time() - start) * 1000, p)
        return out
    except Exception as e:
        logger.error("predict error: %s", e)
        return {"scamProbability": 0.0, "confidence": 0.5, "labels": [], "modelVersion": metadata.get("version", "?")}


@app.get("/health")
def health():
    return {"status": "ok", "modelLoaded": model is not None}
