/**
 * Dataset loader: loads external CSV/JSON into { text, label }.
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const OUTPUT = path.join(__dirname, "..", "data", "normalized.json");

function normalize(t) {
  return (typeof t === "string" ? t : "").replace(/\s+/g, " ").trim().slice(0, 5000);
}

function mapLabel(v) {
  if (!v) return null;
  const x = String(v).toUpperCase().trim();
  if (["SPAM","SCAM","FRAUD","1","TRUE","FRAUDULENT"].includes(x)) return "SCAM";
  if (["HAM","LEGIT","0","FALSE","REAL"].includes(x)) return "LEGIT";
  return null;
}

function loadSmsSpam(fp) {
  const lines = fs.readFileSync(fp, "utf8").split("\n").filter(Boolean);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const m = lines[i].match(/^([^,]+),(.+)$/s);
    if (!m) continue;
    const label = mapLabel(m[1].replace(/^["']|["']$/g, ""));
    const text = m[2].replace(/^["']|["']$/g, "").trim();
    if (label && text) out.push({ text: normalize(text), label, source: "sms_spam" });
  }
  return out;
}

function loadFakeJobs(fp) {
  const lines = fs.readFileSync(fp, "utf8").split("\n").filter(Boolean);
  const h = lines[0].toLowerCase();
  const fi = h.split(",").findIndex(c => c.includes("fraud"));
  const ti = h.split(",").findIndex(c => c.includes("title"));
  const di = h.split(",").findIndex(c => c.includes("description"));
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, ""));
    const label = mapLabel(fi >= 0 && row[fi] === "1" ? "SCAM" : "LEGIT");
    const text = [ti >= 0 ? row[ti] : "", di >= 0 ? row[di] : ""].filter(Boolean).join(" ");
    if (label && text) out.push({ text: normalize(text), label, source: "fake_jobs" });
  }
  return out;
}

function loadJson(fp) {
  const raw = JSON.parse(fs.readFileSync(fp, "utf8"));
  const arr = Array.isArray(raw) ? raw : raw.data || raw.samples || [];
  const out = [];
  for (const r of arr) {
    const text = r.text || r.message || r.content || r.description || "";
    const label = mapLabel(r.label || r.type || r.fraudulent);
    if (text && label) out.push({ text: normalize(text), label, source: "json" });
  }
  return out;
}

function loadAll(dir) {
  const d = dir || DATA_DIR;
  if (!fs.existsSync(d)) { fs.mkdirSync(d, { recursive: true }); return []; }
  const out = [];
  for (const f of fs.readdirSync(d)) {
    if (!/\.(csv|json)$/i.test(f)) continue;
    const fp = path.join(d, f);
    try {
      const ext = path.extname(f).toLowerCase();
      const head = fs.readFileSync(fp, "utf8").slice(0, 300).toLowerCase();
      let loaded;
      if (ext === ".json") loaded = loadJson(fp);
      else if (head.includes("ham") || head.includes("spam")) loaded = loadSmsSpam(fp);
      else if (head.includes("fraud")) loaded = loadFakeJobs(fp);
      else loaded = [];
      out.push(...loaded);
      console.log("Loaded", loaded.length, "from", f);
    } catch (e) { console.warn("Skip", f, e.message); }
  }
  return out;
}

function run() {
  const samples = loadAll();
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(samples, null, 2));
  console.log("Normalized", samples.length, "->", OUTPUT);
  return samples;
}

if (require.main === module) run();
module.exports = { loadAll, normalize, mapLabel };
