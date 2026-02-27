import json
from pathlib import Path
OUT = Path(__file__).resolve().parent.parent / "data" / "hf_seed.jsonl"
def run():
    rows = []
    try:
        from datasets import load_dataset
        ds = load_dataset("ucirvine/sms_spam", split="train", trust_remote_code=True)
        for ex in ds:
            txt = str(ex.get("message", ex.get("text", "")) or "").strip()[:5000]
            lb = "SCAM" if (ex.get("label") == 1 or str(ex.get("label","")).lower() == "spam") else "LEGIT"
            if txt: rows.append({"text": txt, "label": lb, "source": "hf_sms_spam", "lang": "auto"})
    except Exception as e:
        print("HF skip:", e)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        for r in rows: f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print("Loaded", len(rows), "->", OUT)
    return len(rows)
if __name__ == "__main__": run()
