/**
 * Scam AI: abstract provider interface.
 */
const localRules = require("./scamAI.localRules");

const AI_PROVIDER = process.env.AI_PROVIDER || "rules";
const SYNC_TIMEOUT_MS = parseInt(process.env.SCAM_AI_SYNC_TIMEOUT_MS, 10) || 1500;
const DEEP_SCAN_TIMEOUT_MS = parseInt(process.env.SCAM_AI_DEEP_TIMEOUT_MS, 10) || 5000;

async function runWithTimeout(provider, content, targetType, timeoutMs) {
    const t = timeoutMs ?? SYNC_TIMEOUT_MS;
    const fallback = () => Object.assign(localRules.classify(content, targetType), { provider: "rules-only" });
    if (!provider || typeof provider.classify !== "function") return fallback();

    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(fallback()), t);
        provider.classify(content, targetType)
            .then((result) => { clearTimeout(timer); resolve(Object.assign(result, { provider: provider.name || "ai" })); })
            .catch(() => { clearTimeout(timer); resolve(fallback()); });
    });
}

function getProvider() {
    if (AI_PROVIDER === "openai" && process.env.OPENAI_API_KEY) {
        try { return require("./scamAI.openai"); } catch (e) { return null; }
    }
    return null;
}

module.exports = { localRules, getProvider, runWithTimeout, SYNC_TIMEOUT_MS, DEEP_SCAN_TIMEOUT_MS };
