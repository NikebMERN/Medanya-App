"""
Merge all seed datasets into combined_seed.jsonl. Deduplicate by hash(normalized text).
"""
import json
import hashlib
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT = DATA_DIR / "combined_seed.jsonl"


def text_hash(t):
    return hashlib.sha256((t or "").strip().lower().encode()).hexdigest()


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    samples = []
    seen = set()
    for name in ["kaggle_seed.jsonl", "hf_seed.jsonl", "synthetic.json"]:
        p = DATA_DIR / name
        if not p.exists():
            continue
        data = p.read_text(encoding="utf-8", errors="replace")
        if name.endswith(".json"):
            try:
                arr = json.loads(data) if data.strip() else []
            except json.JSONDecodeError:
                arr = []
        else:
            arr = [json.loads(line) for line in data.strip().split("\n") if line.strip()]
        for s in arr:
            text = (s.get("text") or "").strip()
            if not text or not s.get("label") in ("SCAM", "LEGIT"):
                continue
            h = text_hash(text)
            if h in seen:
                continue
            seen.add(h)
            samples.append(s)
        print(f"Merged {len(arr)} from {name}")
    with open(OUTPUT, "w", encoding="utf-8") as f:
        for s in samples:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")
    print(f"Combined {len(samples)} -> {OUTPUT}")
    return len(samples)


if __name__ == "__main__":
    main()
