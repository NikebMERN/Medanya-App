/**
 * Scam AI: decision policy.
 */
const { DECISIONS, STATUSES, SEVERE_LABELS } = require("./scamAI.types");

const THRESHOLD_BLOCK = 85;
const THRESHOLD_REVIEW = 60;

function applyPolicy(ruleScore, aiProbability, aiConfidence, aiLabels) {
    const aiScore100 = Math.round((aiProbability || 0) * 100);
    const combined = Math.max(ruleScore, Math.round(0.65 * ruleScore + 0.35 * aiScore100));
    const hasSevere = Array.isArray(aiLabels) && aiLabels.some((l) => SEVERE_LABELS.has(l));
    const blockCondition = (aiProbability || 0) >= 0.95 && (aiConfidence || 0) >= 0.8 && hasSevere;

    if (blockCondition) return { combinedScore: Math.min(100, combined), status: "BLOCKED", decision: DECISIONS.BLOCK };

    let status = STATUSES.ACTIVE;
    let decision = DECISIONS.ALLOW;

    if (combined >= THRESHOLD_BLOCK) { status = STATUSES.PENDING_REVIEW; decision = DECISIONS.PENDING_REVIEW; }
    else if ((aiProbability || 0) >= 0.9 && (aiConfidence || 0) >= 0.7) { status = STATUSES.PENDING_REVIEW; decision = DECISIONS.PENDING_REVIEW; }
    else if (combined >= THRESHOLD_REVIEW && combined < THRESHOLD_BLOCK) { status = STATUSES.PENDING_REVIEW; decision = DECISIONS.PENDING_REVIEW; }

    return { combinedScore: Math.min(100, combined), status, decision };
}

module.exports = { applyPolicy, THRESHOLD_BLOCK, THRESHOLD_REVIEW };
