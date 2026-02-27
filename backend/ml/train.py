"""
Scam ML training script.
Loads labeled samples from MySQL, trains LogisticRegression on sentence embeddings.
Run: python train.py
Expects env: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB
"""
import os
from pathlib import Path

# Load backend .env so HF_TOKEN etc. are available (Python doesn't auto-load Node's .env)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

import json

from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_recall_fscore_support, accuracy_score
import joblib
import numpy as np

MIN_SAMPLES = int(os.getenv("ML_MIN_LABELS_FOR_TRAINING", "200"))
ARTIFACTS = Path(__file__).resolve().parent / "artifacts"
ARTIFACTS.mkdir(parents=True, exist_ok=True)
MODEL_PATH = Path(os.getenv("ML_MODEL_PATH", str(ARTIFACTS / "model.joblib")))
METADATA_PATH = Path(os.getenv("ML_METADATA_PATH", str(ARTIFACTS / "metadata.json")))
EMBEDDING_MODEL = os.getenv("ML_EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")


def get_db():
    import mysql.connector
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DB"),
    )


def load_samples(conn, limit=10000):
    cur = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT id, text, final_label FROM scam_training_samples WHERE final_label IN ('SCAM','LEGIT') ORDER BY updated_at DESC LIMIT %s",
        (limit,)
    )
    rows = cur.fetchall()
    cur.close()
    return rows


def main():
    conn = get_db()
    samples = load_samples(conn)
    conn.close()

    if len(samples) < MIN_SAMPLES:
        print(f"Need at least {MIN_SAMPLES} labeled samples, got {len(samples)}. Skipping.")
        return 1

    texts = [r["text"] or "" for r in samples]
    labels = [r["final_label"] for r in samples]

    print("Loading embedding model...")
    encoder = SentenceTransformer(EMBEDDING_MODEL)
    print(f"Encoding {len(texts)} texts...")
    X = encoder.encode(texts, show_progress_bar=True)
    y = np.array(labels)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print("Training LogisticRegression...")
    clf = LogisticRegression(max_iter=500, random_state=42, class_weight="balanced")
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    p, r, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="weighted")
    print(f"Test accuracy: {acc:.4f}, precision: {p:.4f}, recall: {r:.4f}, f1: {f1:.4f}")

    version = f"v{len(samples)}"
    data = {"model": clf, "vectorizer": encoder}
    joblib.dump(data, MODEL_PATH)
    metadata = {
        "version": version,
        "n_samples": len(samples),
        "accuracy": float(acc),
        "precision": float(p),
        "recall": float(r),
        "f1": float(f1),
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved {MODEL_PATH} and {METADATA_PATH}, version {version}")
    return 0


def load_dataset_file(path):
    p = Path(path)
    if not p.exists():
        return []
    data = p.read_text(encoding="utf-8", errors="replace")
    if p.suffix == ".jsonl":
        arr = [json.loads(line) for line in data.strip().split("\n") if line.strip()]
    else:
        obj = json.loads(data) if data.strip() else []
        arr = obj if isinstance(obj, list) else obj.get("samples", obj.get("data", []))
    return [{"text": x.get("text", ""), "final_label": x.get("label", "")} for x in arr if x.get("text") and x.get("label") in ("SCAM", "LEGIT")]


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", help="JSON dataset path")
    args = ap.parse_args()
    if args.data:
        samples = load_dataset_file(args.data)
        if len(samples) < 100:
            print("Need >= 100 samples")
            exit(1)
        texts = [r["text"] for r in samples]
        labels = [r["final_label"] for r in samples]
        enc = os.getenv("ML_EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")
        print("Loading embedding model...")
        encoder = SentenceTransformer(enc)
        print(f"Encoding {len(texts)} texts...")
        X = encoder.encode(texts, show_progress_bar=True)
        y = np.array(labels)
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        print("Training LogisticRegression...")
        clf = LogisticRegression(max_iter=500, random_state=42, class_weight="balanced")
        clf.fit(Xtr, ytr)
        acc = accuracy_score(yte, clf.predict(Xte))
        joblib.dump({"model": clf, "vectorizer": encoder}, MODEL_PATH)
        with open(METADATA_PATH, "w") as f:
            json.dump({"version": f"v{len(samples)}", "n_samples": len(samples), "accuracy": float(acc)}, f, indent=2)
        print("Saved", MODEL_PATH)
    else:
        exit(main())
