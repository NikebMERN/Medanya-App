/**
 * Scam AI: ensemble (rules + AI).
 */
const providerModule = require("./scamAI.provider");
const { applyPolicy } = require("./scamAI.policy");
const fraudService = require("../fraudPrevention.service");

async function computeRiskScoreWithAI(userId, content, targetType) {
    const ruleResult = await fraudService.computeRiskScore(userId, content);
    const ruleScore = ruleResult.score ?? 0;

    const aiProvider = providerModule.getProvider();
    const aiResult = await providerModule.runWithTimeout(aiProvider, content, targetType, providerModule.SYNC_TIMEOUT_MS);

    const aiProbability = aiResult.scamProbability ?? 0;
    const aiConfidence = aiResult.confidence ?? 0.5;
    const aiLabels = aiResult.labels || [];

    const policy = applyPolicy(ruleScore, aiProbability, aiConfidence, aiLabels);
    const dbStatus = policy.decision === "BLOCK" ? "BLOCKED" : policy.status;

    return {
        rule: { score: ruleScore, matchedKeywords: ruleResult.matchedKeywords || [], status: ruleResult.status },
        ai: { scamProbability: aiProbability, confidence: aiConfidence, labels: aiLabels, explanation: aiResult.explanation || null, provider: aiResult.provider || "rules-only" },
        final: { combinedScore: policy.combinedScore, status: dbStatus, decision: policy.decision },
    };
}

module.exports = { computeRiskScoreWithAI };
