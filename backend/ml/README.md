# Scam ML Service

Production-ready scam detection ML pipeline using weak supervision, active learning, and continuous retraining.

## Setup

```bash
cd backend
pip install -r ml/requirements.txt
```

Copy `.env` values for MySQL (MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB).

## Run inference service

```bash
uvicorn ml.app:app --host 0.0.0.0 --port 8000
```

POST /predict expects `{"text": "title + description + location"}` and returns:
```json
{"scamProbability": 0.23, "confidence": 0.8, "labels": [], "modelVersion": "v200"}
```

## Train model

Requires >= 200 labeled samples (final_label SCAM or LEGIT in scam_training_samples).

```bash
# Set MySQL env vars, then:
python ml/train.py
```

Output: model.joblib, metadata.json

## Evaluate

```bash
python ml/evaluate.py
```

## Node integration

- Node calls ML_INFERENCE_URL/predict with 300ms timeout
- If ML service down or model not ready => rules-only fallback (no blocking)
- Training runs only when >= ML_MIN_LABELS_FOR_TRAINING labels
