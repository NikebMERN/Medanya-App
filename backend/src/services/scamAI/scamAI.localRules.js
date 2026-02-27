/**
 * Scam AI: deterministic local rules classifier.
 */
const { filterValidLabels } = require("./scamAI.types");

const PATTERN_LABELS = [
    { pattern: /\b(deposit|advance payment|upfront money|pay first)\b/i, label: "UPFRONT_PAYMENT" },
    { pattern: /\b(deposit required|down payment)\b/i, label: "DEPOSIT_REQUIRED" },
    { pattern: /\b(passport|id card|government id|send your id)\b/i, label: "PASSPORT_REQUEST" },
    { pattern: /\b(whatsapp|telegram|signal|email me|dm me|contact me on)\b/i, label: "OFF_PLATFORM_CONTACT" },
    { pattern: /\b(western union|wire transfer|moneygram|bank transfer|send money)\b/i, label: "WIRE_TRANSFER" },
    { pattern: /\b(crypto|bitcoin|btc|ethereum|usdt)\b/i, label: "CRYPTO_PAYMENT" },
    { pattern: /\b(too good|amazing salary|earn big|get rich|easy money)\b/i, label: "TOO_GOOD_TO_BE_TRUE" },
    { pattern: /\b(urgent|act now|limited time|hurry|asap)\b/i, label: "SUSPICIOUS_LANGUAGE" },
    { pattern: /\b(ssn|social security|bank account|credit card)\b/i, label: "PERSONAL_DATA_REQUEST" },
];

const BASE_KEYWORDS = [
    "deposit", "transfer", "western union", "crypto", "bitcoin", "upfront money",
    "wire transfer", "moneygram", "send money first", "advance payment",
];

function classify(content, targetType) {
    if (!content) return { scamProbability: 0, confidence: 0.5, labels: [], explanation: "No content" };
    const text = [content.title || "", content.description || "", content.location || ""]
        .filter(Boolean).join(" ").toLowerCase();
    if (!text.trim()) return { scamProbability: 0, confidence: 0.5, labels: [], explanation: "Empty" };

    const labels = [];
    for (const { pattern, label } of PATTERN_LABELS) {
        if (pattern.test(text) && !labels.includes(label)) labels.push(label);
    }
    if (labels.length > 0) {
        if (targetType === "JOB" && !labels.includes("JOB_SCAM_PATTERN")) labels.push("JOB_SCAM_PATTERN");
        if (targetType === "MARKET" && !labels.includes("MARKET_SCAM_PATTERN")) labels.push("MARKET_SCAM_PATTERN");
    }
    const filteredLabels = filterValidLabels(labels);

    let score = 0;
    for (const kw of BASE_KEYWORDS) if (text.includes(kw)) score += 0.15;
    score += filteredLabels.length * 0.12;
    const scamProbability = Math.min(1, Math.round(score * 100) / 100);
    const confidence = scamProbability > 0.5 ? 0.85 : Math.max(0.5, 0.5 + filteredLabels.length * 0.05);
    const explanation = filteredLabels.length ? "Local rules: " + filteredLabels.slice(0, 3).join(", ") : "No scam indicators";
    return {
        scamProbability,
        confidence: Math.min(1, Math.round(confidence * 100) / 100),
        labels: filteredLabels,
        explanation: String(explanation).slice(0, 160),
    };
}

module.exports = { classify };
