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

module.exports = {
    updateTrustScore,
    getTrustScore,
    shouldRestrictPosting,
    shouldAutoFlag,
    DELTAS,
};
