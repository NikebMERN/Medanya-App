"""
Evaluate scam ML model on labeled samples.
Run: python evaluate.py
"""
import os
import joblib
from pathlib import Path

import mysql.connector
from sentence_transformers import SentenceTransformer
from sklearn.metrics import precision_recall_fscore_support, accuracy_score, classification_report

MODEL_PATH = Path(os.getenv("ML_MODEL_PATH", "model.joblib"))
EMBEDDING_MODEL = os.getenv("ML_EMBEDDING_MODEL", "all-MiniLM-L6-v2")


def get_db():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DB"),
    )


def main():
    if not MODEL_PATH.exists():
        print(f"Model not found: {MODEL_PATH}")
        return 1

    data = joblib.load(MODEL_PATH)
    model = data["model"]
    encoder = data.get("vectorizer") or SentenceTransformer(EMBEDDING_MODEL)

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT text, final_label FROM scam_training_samples WHERE final_label IN ('SCAM','LEGIT') LIMIT 2000"
    )
    rows = cur.fetchall()
    conn.close()

    if not rows:
        print("No labeled samples")
        return 1

    texts = [r["text"] or "" for r in rows]
    y_true = [r["final_label"] for r in rows]
    X = encoder.encode(texts)
    y_pred = model.predict(X)

    acc = accuracy_score(y_true, y_pred)
    p, r, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="weighted")
    print(f"Accuracy: {acc:.4f}")
    print(f"Precision: {p:.4f}, Recall: {r:.4f}, F1: {f1:.4f}")
    print(classification_report(y_true, y_pred))
    return 0


if __name__ == "__main__":
    exit(main())
