# Scam ML Pipeline (Option B)

Multilingual scam detection: external datasets + app feedback loop + admin-approved retraining.

## 1. Dataset Bootstrap

Uses your data in `backend/data/`:
- `spam.csv` - SMS spam (v1=ham/spam, v2=message)
- `Fake Postings.csv` - job postings (fraudulent=0/1)

```bash
cd backend
python ml/scripts/load_kaggle_csvs.py   # -> ml/data/kaggle_seed.jsonl
python ml/scripts/load_hf_datasets.py   # optional HF (pip install datasets)
python ml/scripts/merge_datasets.py     # -> ml/data/combined_seed.jsonl
```

## 2. Train

```bash
python ml/train.py --data ml/data/combined_seed.jsonl
```

Uses `paraphrase-multilingual-MiniLM-L12-v2`. Saves to `ml/artifacts/model.joblib` and `metadata.json`.

## 3. Run Inference

```bash
uvicorn ml.service:app --host 0.0.0.0 --port 8000
```

POST /predict: `{ "text": "...", "targetType": "JOB|MARKET" }`
Output: `{ scamProbability, confidence, modelVersion, labels }`

## 4. Admin Retrain Flow

1. Weekly cron adds `requestRetrainApproval` job
2. If >= 200 labeled samples, creates PENDING row in `ml_retrain_approval`
3. Admin: GET /admin/ml/retrain-status - see pending request
4. Admin: POST /admin/ml/approve-retrain - approves and triggers training
5. Admin: POST /admin/ml/reject-retrain - rejects

Training only runs after admin approval.

## 5. Continuous Learning

- `scam_training_samples`: stores text + weakLabel (rules) + final_label (reports/admin/auto)
- >= 3 reports confirmed -> SCAM
- Active 7 days, 0 reports -> LEGIT (auto)
- Weekly: request approval -> admin approves -> retrain
