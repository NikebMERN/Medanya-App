/**
 * Scam ML: ensemble (rules + ML).
 * Uses ML when service available and enough labels; else rules-only.
 */
const fraudService = require("../fraudPrevention.service");
const scamMLService = require("./scamML.service");
const scamTraining = require("./scamTraining.mysql");

const ML_READY_MIN_LABELS = scamMLService.getMinLabelsForML();

function applyMLPolicy(ruleScore, mlProbability, mlConfidence, hasML) {
    let combined = ruleScore;
    if (hasML && mlProbability != null) {
        const mlScore100 = Math.round((mlProbability || 0) * 100);
        combined = Math.max(ruleScore, Math.round(0.6 * ruleScore + 0.4 * mlScore100));
    }

    let status = "active";
    let decision = "ALLOW";

    const blockCondition =
        hasML &&
        (mlProbability || 0) >= 0.95 &&
        (mlConfidence || 0) >= 0.8 &&
        (ruleScore || 0) >= 70;

    if (blockCondition) {
        return { combinedScore: Math.min(100, combined), status: "BLOCKED", decision: "BLOCK" };
    }

    if (combined >= 60) {
        status = "PENDING_REVIEW";
        decision = "PENDING_REVIEW";
    }

    return { combinedScore: Math.min(100, combined), status, decision };
}

async function computeRiskScoreWithML(userId, content, targetType) {
    const ruleResult = await fraudService.computeRiskScore(userId, content);
    const ruleScore = ruleResult.score ?? 0;
    const text = scamTraining.normalizeText(content.title, content.description, content.location);

    let mlResult = null;
    const labeledCount = await scamTraining.getLabeledCount();
    if (labeledCount >= ML_READY_MIN_LABELS) {
        mlResult = await scamMLService.predict(text, targetType);
    }

    const mlProbability = mlResult?.scamProbability ?? 0;
    const mlConfidence = mlResult?.confidence ?? 0.5;
    const mlModelVersion = mlResult?.modelVersion ?? null;

    const hasML = !!mlResult;
    const policy = applyMLPolicy(ruleScore, mlProbability, mlConfidence, hasML);

    return {
        rule: { score: ruleScore, matchedKeywords: ruleResult.matchedKeywords || [], status: ruleResult.status },
        ml: mlResult
            ? { scamProbability: mlProbability, confidence: mlConfidence, modelVersion: mlModelVersion, labels: mlResult.labels || [] }
            : null,
        final: { combinedScore: policy.combinedScore, status: policy.status, decision: policy.decision },
    };
}

module.exports = { computeRiskScoreWithML, applyMLPolicy };
