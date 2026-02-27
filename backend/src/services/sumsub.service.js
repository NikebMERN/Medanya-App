/**
 * Sumsub KYC provider service.
 * Creates applicants/access tokens and verifies webhook signatures.
 * @see https://docs.sumsub.com/reference/generate-access-token-for-applicant-actions
 * @see https://docs.sumsub.com/docs/user-verification-webhooks
 */
const crypto = require("crypto");

const BASE_URL = process.env.SUMSUB_BASE_URL || "https://api.sumsub.com";
const APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const WEBHOOK_SECRET = process.env.SUMSUB_WEBHOOK_SECRET;
const LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME || "basic-kyc-level";

function err(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function isConfigured() {
    return !!(APP_TOKEN && SECRET_KEY);
}

/**
 * Generate HMAC signature for Sumsub API.
 */
function sign(method, url, body = "", timestamp) {
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const toSign = ts + method.toUpperCase() + url;
    const bodyStr = body ? (typeof body === "string" ? body : JSON.stringify(body)) : "";
    const toSignFull = bodyStr ? toSign + bodyStr : toSign;
    const sig = crypto.createHmac("sha256", SECRET_KEY).update(toSignFull).digest("hex");
    return { sig, ts };
}

/**
 * Create access token for Sumsub Mobile SDK.
 * @param {Object} params
 * @param {string} params.userId - Our user ID (external)
 * @param {string} [params.levelName] - Verification level
 * @param {number} [params.ttlInSecs] - Token TTL (default 600)
 * @returns {Promise<{token:string, applicantId:string}>}
 */
async function createAccessToken({ userId, levelName = LEVEL_NAME, ttlInSecs = 600 } = {}) {
    if (!APP_TOKEN || !SECRET_KEY) {
        throw err("CONFIG_ERROR", "Sumsub app token and secret key required");
    }
    const externalUserId = String(userId || "");
    if (!externalUserId) throw err("VALIDATION_ERROR", "userId is required");

    const url = `/resources/accessTokens/sdk?userId=${encodeURIComponent(externalUserId)}&levelName=${encodeURIComponent(levelName)}&ttlInSecs=${ttlInSecs}`;
    const { sig, ts } = sign("POST", url);

    const res = await fetch(`${BASE_URL}${url}`, {
        method: "POST",
        headers: {
            "X-App-Token": APP_TOKEN,
            "X-App-Access-Sig": sig,
            "X-App-Access-Ts": String(ts),
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        const text = await res.text();
        throw err("SUMSUB_API_ERROR", `Sumsub API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const token = data?.token;
    const applicantId = data?.userId || data?.applicantId;

    if (!token) throw err("SUMSUB_API_ERROR", "Missing token in Sumsub response");

    return { token, applicantId };
}

/**
 * Verify Sumsub webhook signature.
 * Sumsub uses X-Payload-Digest (SHA-256 of secret + payload).
 * @param {string|Buffer} rawBody - Raw request body
 * @param {string} digest - X-Payload-Digest header
 * @returns {boolean}
 */
function verifyWebhookSignature(rawBody, digest) {
    const secret = WEBHOOK_SECRET || SECRET_KEY;
    if (!secret || !digest) return false;
    const body = typeof rawBody === "string" ? rawBody : (rawBody && rawBody.toString ? rawBody.toString("utf8") : "");
    const payload = secret + body;
    const expected = crypto.createHash("sha256").update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(expected, "hex"));
}

/**
 * Parse applicantReviewed webhook payload.
 * @param {Object} payload - Parsed JSON body
 * @returns {{reviewAnswer:string, applicantId:string, externalUserId?:string, rejectLabels?:string[], moderationComment?:string, reviewRejectType?:string}}
 */
function parseApplicantReviewedPayload(payload) {
    const reviewResult = payload?.reviewResult || payload;
    const reviewAnswer = reviewResult?.reviewAnswer || payload?.reviewAnswer;
    const applicantId = payload?.applicantId || reviewResult?.applicantId;
    const externalUserId = payload?.externalUserId || payload?.userId;
    const rejectLabels = reviewResult?.rejectLabels || payload?.rejectLabels || [];
    const moderationComment = reviewResult?.moderationComment || payload?.moderationComment;
    const reviewRejectType = reviewResult?.reviewRejectType || payload?.reviewRejectType;
    return {
        reviewAnswer,
        applicantId,
        externalUserId,
        rejectLabels,
        moderationComment,
        reviewRejectType,
    };
}

module.exports = {
    createAccessToken,
    verifyWebhookSignature,
    parseApplicantReviewedPayload,
    isConfigured,
};
