/**
 * Fraud prevention: OTP check, rate limits, risk scoring, keyword filtering.
 * Used by jobs and marketplace create/update.
 */
const { pool } = require("../config/mysql");
const crypto = require("crypto");

const SCAM_KEYWORDS = [
    "deposit", "transfer", "western union", "crypto", "bitcoin", "upfront money",
    "wire transfer", "moneygram", "paypal gift", "send money first", "advance payment",
];

function codeErr(code, message, status = 400) {
    const e = new Error(message);
    e.code = code;
    e.status = status || (code === "OTP_REQUIRED" || code === "RATE_LIMIT" ? (code === "OTP_REQUIRED" ? 403 : 429) : 400);
    return e;
}

/** Returns user row with otp_verified, kyc_status, kyc_level, created_at, reports_count */
async function getUserFraudContext(userId) {
    const [rows] = await pool.query(
        `SELECT otp_verified, kyc_status, kyc_level, created_at, safety_acknowledged_at
         FROM users WHERE id = ? LIMIT 1`,
        [userId]
    );
    if (!rows.length) return null;
    const u = rows[0];
    const createdAt = u.created_at ? new Date(u.created_at) : new Date();
    const daysSinceCreation = (Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000);
    // User reports count - extend when reports table supports targetType=user
    const reportsCount = 0;
    return {
        otpVerified: !!u.otp_verified,
        kycStatus: u.kyc_status || "none",
        kycLevel: parseInt(u.kyc_level, 10) || 0,
        daysSinceCreation,
        isNewAccount: daysSinceCreation < 7,
        safetyAcknowledgedAt: u.safety_acknowledged_at,
        reportsCount,
    };
}

/** Check OTP verified; throw OTP_REQUIRED if not */
async function requireOtpVerified(userId) {
    const ctx = await getUserFraudContext(userId);
    if (!ctx) throw codeErr("UNAUTHORIZED", "User not found", 401);
    if (!ctx.otpVerified) {
        throw codeErr("OTP_REQUIRED", "Phone verification required to post. Please verify your phone number.", 403);
    }
}

/** Count jobs created by user today */
async function countJobsToday(userId) {
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS c FROM jobs
         WHERE created_by = ? AND DATE(created_at) = CURDATE()
         AND status IN ('active','closed','PENDING_REVIEW','HIDDEN_PENDING_REVIEW')`,
        [userId]
    );
    return rows[0]?.c ?? 0;
}

/** Count marketplace items created by user today */
async function countListingsToday(userId) {
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS c FROM marketplace_items
         WHERE seller_id = ? AND DATE(created_at) = CURDATE()
         AND status IN ('active','sold','removed','PENDING_REVIEW','HIDDEN_PENDING_REVIEW')`,
        [userId]
    );
    return rows[0]?.c ?? 0;
}

/** Get rate limits: { jobsPerDay, listingsPerDay } */
function getRateLimits(ctx) {
    if (ctx.kycLevel >= 2) return { jobsPerDay: 5, listingsPerDay: 10 };
    if (ctx.isNewAccount) return { jobsPerDay: 1, listingsPerDay: 2 };
    if (ctx.reportsCount > 0) return { jobsPerDay: 1, listingsPerDay: 2 };
    return { jobsPerDay: 2, listingsPerDay: 5 };
}

/** Check job creation rate limit */
async function checkJobRateLimit(userId) {
    const ctx = await getUserFraudContext(userId);
    if (!ctx) throw codeErr("UNAUTHORIZED", "User not found", 401);
    const { jobsPerDay } = getRateLimits(ctx);
    const count = await countJobsToday(userId);
    if (count >= jobsPerDay) {
        throw codeErr("RATE_LIMIT", `You can post up to ${jobsPerDay} job(s) per day. Try again tomorrow.`, 429);
    }
}

/** Check marketplace creation rate limit */
async function checkListingRateLimit(userId) {
    const ctx = await getUserFraudContext(userId);
    if (!ctx) throw codeErr("UNAUTHORIZED", "User not found", 401);
    const { listingsPerDay } = getRateLimits(ctx);
    const count = await countListingsToday(userId);
    if (count >= listingsPerDay) {
        throw codeErr("RATE_LIMIT", `You can post up to ${listingsPerDay} listing(s) per day. Try again tomorrow.`, 429);
    }
}

/** Scan text for scam keywords; return { keywords: string[], riskBoost: number } */
function scanScamKeywords(text) {
    if (!text || typeof text !== "string") return { keywords: [], riskBoost: 0 };
    const lower = text.toLowerCase();
    const matched = SCAM_KEYWORDS.filter((kw) => lower.includes(kw));
    const riskBoost = Math.min(30, matched.length * 10);
    return { keywords: matched, riskBoost };
}

/** Compute risk score (0-100) for a job/listing */
async function computeRiskScore(userId, { title, description, location }) {
    const ctx = await getUserFraudContext(userId);
    if (!ctx) return { score: 50, matchedKeywords: [], status: "PENDING_REVIEW" };

    let score = 0;
    const matchedKeywords = [];

    if (ctx.isNewAccount) score += 20;
    if (!location || String(location).trim().length === 0) score += 15;

    const titleScan = scanScamKeywords(title);
    const descScan = scanScamKeywords(description || "");
    if (titleScan.keywords.length || descScan.keywords.length) {
        score += Math.max(titleScan.riskBoost, descScan.riskBoost);
        matchedKeywords.push(...new Set([...titleScan.keywords, ...descScan.keywords]));
    }

    if (ctx.reportsCount > 0) score += 40;
    if (ctx.kycLevel < 2) score += 15;
    if (ctx.kycLevel >= 2) score -= 20;

    score = Math.max(0, Math.min(100, score));

    const status = score > 60 ? "PENDING_REVIEW" : "active";
    return { score, matchedKeywords, status };
}

/** Hash document number for storage (never store plain) */
function hashDocNumber(docNumber, salt) {
    if (!docNumber || !salt) return null;
    return crypto.createHmac("sha256", salt).update(String(docNumber)).digest("hex");
}

/** Compute risk score with AI (sync lightweight). Returns { rule, ai, final }. Throws on BLOCK. */
async function computeRiskScoreWithAI(userId, content, targetType) {
    const scamAI = require("./scamAI/scamAI.ensemble");
    const risk = await scamAI.computeRiskScoreWithAI(userId, content, targetType);

    if (risk.final.decision === "BLOCK") {
        throw codeErr(
            "FORBIDDEN",
            "Your post was flagged by our safety system. Please remove any requests for upfront payment, wire transfer, or personal documents.",
            403
        );
    }

    return risk;
}

/** Compute risk score with ML (rules + ML inference). Returns { rule, ml, final }. Throws on BLOCK. Uses rules-only when ML not ready. */
async function computeRiskScoreWithML(userId, content, targetType) {
    const scamML = require("./scamML/scamML.ensemble");
    const risk = await scamML.computeRiskScoreWithML(userId, content, targetType);

    if (risk.final.decision === "BLOCK") {
        throw codeErr(
            "FORBIDDEN",
            "Your post was flagged by our safety system. Please remove any requests for upfront payment, wire transfer, or personal documents.",
            403
        );
    }

    return risk;
}

/** Enqueue async deep scan (BullMQ). Fire-and-forget; never blocks. */
async function enqueueDeepScan({ targetType, targetId, userId, content }) {
    try {
        const { scamAIQueue } = require("../jobs/queues/notification.queue");
        await scamAIQueue.add(
            "deepScan",
            { targetType, targetId, userId, content: content || {} },
            { attempts: 2, backoff: { type: "exponential", delay: 2000 } }
        );
    } catch (e) {
        const logger = require("../utils/logger.util");
        logger.warn("fraudPrevention: enqueueDeepScan failed", e?.message);
    }
}

module.exports = {
    requireOtpVerified,
    checkJobRateLimit,
    checkListingRateLimit,
    getUserFraudContext,
    computeRiskScore,
    scanScamKeywords,
    hashDocNumber,
    computeRiskScoreWithAI,
    computeRiskScoreWithML,
    enqueueDeepScan,
};
