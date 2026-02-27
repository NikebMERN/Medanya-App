/**
 * Veriff KYC provider service.
 * Creates verification sessions and verifies webhook signatures.
 * @see https://devdocs.veriff.com/docs/how-to-generate-sessions-manually
 * @see https://devdocs.veriff.com/docs/decision-webhook
 */
const crypto = require("crypto");

const BASE_URL = process.env.VERIFF_BASE_URL || "https://stationapi.veriff.com";
const API_KEY = process.env.VERIFF_API_KEY;
const SHARED_SECRET = process.env.VERIFF_SHARED_SECRET;
// Use VERIFF_SHARED_SECRET for HMAC (do NOT use VERIFF_WEBHOOK_SECRET)
const HMAC_SECRET = process.env.VERIFF_SHARED_SECRET;

function err(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function isConfigured() {
    return !!(API_KEY && SHARED_SECRET);
}

/**
 * Create a Veriff verification session.
 * @param {Object} params
 * @param {string} params.userId - Our user ID (external ID)
 * @param {string} [params.vendorData] - Optional vendor data
 * @param {string} [params.fullName] - Full name (optional, can be pre-filled)
 * @returns {Promise<{sessionId:string,sessionUrl:string,sessionToken:string}>}
 */
async function createSession({ userId, vendorData, fullName } = {}) {
    if (!API_KEY || !SHARED_SECRET) {
        throw err("CONFIG_ERROR", "Veriff API key and shared secret required");
    }
    const externalId = String(userId || "");
    if (!externalId) throw err("VALIDATION_ERROR", "userId is required");

    const callbackUrl = process.env.VERIFF_CALLBACK_URL || (() => {
        const base = process.env.PUBLIC_WEBHOOK_BASE_URL;
        return base ? `${base.replace(/\/$/, "")}/api/veriff/callback` : undefined;
    })();
    const body = {
        verification: {
            person: fullName ? { firstName: fullName.split(" ")[0] || fullName, lastName: fullName.split(" ").slice(1).join(" ") || "" } : undefined,
            vendorData: vendorData || `userId:${externalId}`,
            callback: callbackUrl,
        },
    };

    const res = await fetch(`${BASE_URL}/v1/sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-AUTH-CLIENT": API_KEY,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        let msg = `Veriff API error ${res.status}`;
        try {
            const j = JSON.parse(text);
            if (j.status && j.status.message) msg = j.status.message;
        } catch (_) {}
        throw err("VERIFF_API_ERROR", msg || text);
    }

    const data = await res.json();
    const verification = data?.verification || data;
    const sessionId = verification?.id || verification?.sessionId;
    const sessionToken = verification?.sessionToken || verification?.url?.split("/").pop();
    const sessionUrl = verification?.url || (sessionToken ? `${BASE_URL.replace("stationapi", "magic")}/v1/flow/${sessionToken}` : null);

    if (!sessionId || !sessionUrl) {
        throw err("VERIFF_API_ERROR", "Missing sessionId or sessionUrl in Veriff response");
    }

    return {
        sessionId,
        sessionUrl,
        sessionToken: sessionToken || sessionId,
        status: verification?.status,
    };
}

/**
 * Verify Veriff webhook HMAC signature.
 * @param {string|Buffer} rawBody - Raw request body
 * @param {string} signature - X-HMAC-SIGNATURE header value
 * @returns {boolean}
 */
/**
 * Verify webhook HMAC. RAW BODY is signed - do NOT parse JSON before verifying.
 * Uses VERIFF_SHARED_SECRET (not URL). Header: X-HMAC-SIGNATURE.
 */
function verifyWebhookSignature(rawBody, signature) {
    if (!HMAC_SECRET || !signature) return false;
    const body = typeof rawBody === "string" ? rawBody : (rawBody && rawBody.toString ? rawBody.toString("utf8") : "");
    const expected = crypto.createHmac("sha256", HMAC_SECRET).update(body).digest("hex");
    try {
        return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
    } catch {
        return false;
    }
}

/**
 * Parse decision webhook payload.
 * Veriff sends verification.status = "approved"|"declined"|"resubmission_requested".
 * @param {Object} payload - Parsed JSON body
 * @returns {{status:string, sessionId:string, externalId?:string, reason?:string, labels?:string[]}}
 */
function parseDecisionPayload(payload) {
    const v = payload?.verification || {};
    const status = (v.status || payload?.decision || payload?.status || "").toString().trim();
    const sessionId = v.id || payload?.id || payload?.sessionId || v.sessionId;
    const vendorData = v.vendorData || payload?.vendorData || v.externalId;
    const reasonCode = v.reasonCode || payload?.reasonCode || null;
    const reason = v.reason || payload?.reason || payload?.moderationComment || v.moderationComment;
    const labels = (v.riskLabels || payload?.rejectLabels || payload?.verification?.rejectLabels || []).map((l) => (typeof l === "object" ? l?.label : l)).filter(Boolean);
    return { status, sessionId: sessionId ? String(sessionId) : null, externalId: vendorData ? String(vendorData) : null, reasonCode, reason, labels };
}

/**
 * Parse event webhook payload (session_started, session_submitted).
 * @param {Object} payload - Parsed JSON body
 * @returns {{action:string, sessionId:string, vendorData?:string, endUserId?:string}}
 */
function parseEventPayload(payload) {
    const sessionId = payload?.id || payload?.sessionId || null;
    const action = (payload?.action || "").toString().toLowerCase();
    const vendorData = payload?.vendorData || null;
    const endUserId = payload?.endUserId || null;
    return {
        action,
        sessionId: sessionId ? String(sessionId) : null,
        vendorData: vendorData ? String(vendorData) : undefined,
        endUserId: endUserId ? String(endUserId) : undefined,
    };
}

/**
 * Fetch decision from Veriff API (fallback when webhook missed).
 * @param {string} sessionId - Veriff session ID
 * @returns {Promise<Object>} Decision payload or null
 */
async function getDecision(sessionId) {
    if (!API_KEY || !SHARED_SECRET) return null;
    const sid = String(sessionId || "").trim();
    if (!sid) return null;
    const res = await fetch(`${BASE_URL}/v1/sessions/${sid}/decision`, {
        method: "GET",
        headers: { "X-AUTH-CLIENT": API_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data;
}

module.exports = {
    createSession,
    verifyWebhookSignature,
    parseDecisionPayload,
    parseEventPayload,
    getDecision,
    isConfigured,
};
