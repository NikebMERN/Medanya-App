/**
 * Translate subset to Amharic/Arabic. Run: node translate_subset.py via Python.
 * Or: python ml/dataset/translate_subset.py data/combined.json data/am.json am
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DATA = path.join(__dirname, "..", "data", "combined.json");
const PY = path.join(__dirname, "translate_subset.py");

if (require.main === module) {
  if (!fs.existsSync(DATA)) {
    console.log("Run combineDatasets.js first");
    process.exit(1);
  }
  try {
    execSync(`python "${PY}" "${DATA}" "${path.join(path.dirname(DATA), "combined_am.json")}" am`, { stdio: "inherit" });
    execSync(`python "${PY}" "${DATA}" "${path.join(path.dirname(DATA), "combined_ar.json")}" ar`, { stdio: "inherit" });
  } catch (e) {
    console.log("Install: pip install deep-translator");
  }
}
