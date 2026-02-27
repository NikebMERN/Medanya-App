"""
Translate subset of dataset to Amharic (am) and Arabic (ar).
Usage: python translate_subset.py combined.json output_amharic.json am
Requires: pip install deep-translator
"""
import sys
import json
import os

def main():
    if len(sys.argv) < 4:
        print("Usage: python translate_subset.py <input.json> <output.json> <lang>")
        sys.exit(1)
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    lang = sys.argv[3]  # am or ar

    with open(input_path) as f:
        data = json.load(f)

    try:
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source="en", target=lang)
    except ImportError:
        print("Install: pip install deep-translator")
        sys.exit(1)

    n = min(500, len(data))
    translated = []
    for i, item in enumerate(data[:n]):
        try:
            text = item.get("text", "")[:3000]
            if text:
                t = translator.translate(text)
                translated.append({**item, "text": t, "lang": lang})
            else:
                translated.append({**item, "lang": lang})
        except Exception as e:
            translated.append({**item, "text": item.get("text", ""), "lang": lang})
        if (i + 1) % 50 == 0:
            print(f"Translated {i + 1}/{n}")

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(translated, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(translated)} to {output_path}")

if __name__ == "__main__":
    main()
