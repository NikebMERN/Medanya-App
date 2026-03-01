/**
 * Behavior Trust Score: 0–100, default 50.
 * Rules: +10 successful chat, +15 job/market, +5 fast reply, -20 minor report, -50 severe, -30 scam keyword.
 * Enforcement: <40 restrict posting, <20 auto-flag.
 */
const userTrustDb = require("../modules/trust/userTrust.mysql");

const DELTAS = {
    SUCCESSFUL_CHAT: 10,
    SUCCESSFUL_JOB_MARKET: 15,
    FAST_REPLY: 5,
    MINOR_REPORT: -20,
    SEVERE_REPORT: -50,
    SCAM_KEYWORD: -30,
};

async function updateTrustScore(userId, delta) {
    const d = Number(delta);
    if (isNaN(d) || d === 0) return null;
    return userTrustDb.updateTrustScore(userId, d);
}

async function getTrustScore(userId) {
    return userTrustDb.getTrustScore(userId);
}

function shouldRestrictPosting(trustScore) {
    return trustScore < 40;
}

function shouldAutoFlag(trustScore) {
    return trustScore < 20;
}

/** Level 2 anti-bot: score < 35 => high risk, ignore view counting. */
function isHighRiskViewer(trustScore) {
    return trustScore < 35;
}

/**
 * Deterministic sampling for 35–50 band: count 1 out of 3.
 * Uses hash(userId + entityId + date) mod 3 === 0.
 */
function shouldCountSampledView(userId, entityId, dateStr) {
    const crypto = require("crypto");
    const input = `${userId}|${entityId}|${dateStr}`;
    const h = crypto.createHash("sha256").update(input).digest("hex");
    const mod = parseInt(h.slice(0, 8), 16) % 3;
    return mod === 0;
}

module.exports = {
    updateTrustScore,
    getTrustScore,
    shouldRestrictPosting,
    shouldAutoFlag,
    isHighRiskViewer,
    shouldCountSampledView,
    DELTAS,
};
