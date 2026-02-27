import os, csv, json
from pathlib import Path
BASE = Path(__file__).resolve().parent.parent.parent
DATA = BASE / "data"
OUT = Path(__file__).resolve().parent.parent / "data" / "kaggle_seed.jsonl"

def run():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    if (DATA / "spam.csv").exists():
        with open(DATA / "spam.csv", encoding="utf-8", errors="replace") as f:
            r = csv.reader(f)
            next(r, None)
            for row in r:
                if len(row) < 2: continue
                lb = "SCAM" if (row[0] or "").strip().lower() == "spam" else "LEGIT"
                txt = (row[1] or "").strip()[:5000]
                if txt: rows.append({"text": txt, "label": lb, "source": "kaggle_sms_spam", "lang": "auto"})
    if (DATA / "Fake Postings.csv").exists():
        with open(DATA / "Fake Postings.csv", encoding="utf-8", errors="replace") as f:
            r = csv.DictReader(f)
            for row in r:
                lb = "SCAM" if str(row.get("fraudulent", "0")).strip() == "1" else "LEGIT"
                txt = " ".join([row.get("title",""), row.get("description",""), row.get("company_profile","")]).strip()[:5000]
                if txt: rows.append({"text": txt, "label": lb, "source": "kaggle_fake_jobs", "lang": "auto"})
    with open(OUT, "w", encoding="utf-8") as f:
        for r in rows: f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print("Loaded", len(rows), "->", OUT)
    return len(rows)
if __name__ == "__main__": run()
