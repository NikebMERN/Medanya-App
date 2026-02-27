/**
 * Provider KYC orchestration (Sumsub | Veriff).
 * Uses KYC_PROVIDER env var to select provider.
 */
const veriffService = require("../../services/veriff.service");
const sumsubService = require("../../services/sumsub.service");
const userDb = require("../users/user.mysql");
const kycSessionsDb = require("./kycSessions.mysql");
const { pool } = require("../../config/mysql");
const crypto = require("crypto");

const KYC_PROVIDER = (process.env.KYC_PROVIDER || "").toUpperCase();
const SALT = process.env.KYC_HASH_SALT || "medanya-kyc-salt-v1";
const MAX_VERIFICATION_TRIALS_PER_24H = Number(process.env.KYC_MAX_TRIALS_PER_24H || 5) || 5;

function err(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function hashValue(val) {
    if (!val) return null;
    return crypto.createHmac("sha256", SALT).update(String(val)).digest("hex");
}

function isProviderKycEnabled() {
    return KYC_PROVIDER === "SUMSUB" || KYC_PROVIDER === "VERIFF";
}

function getProvider() {
    return KYC_PROVIDER;
}

function getAgeFromDob(dob) {
    if (!dob) return null;
    const d = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
}

async function countVerificationTrialsLast24h(userId) {
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM kyc_sessions
         WHERE user_id = ? AND provider = ?
         AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
        [userId, KYC_PROVIDER]
    );
    return Number(rows?.[0]?.cnt ?? 0);
}

/**
 * Start provider KYC flow.
 * @param {string} userId
 * @param {Object} user - { full_name, dob, otp_verified, is_banned }
 * @returns {Promise<{provider, sessionUrl?, accessToken?, applicantId?, sessionId?}>}
 */
async function startKyc(userId, user) {
    if (!isProviderKycEnabled()) {
        throw err("CONFIG_ERROR", "KYC_PROVIDER must be sumsub or veriff");
    }
    if (user.is_banned) {
        throw err("FORBIDDEN", "Banned users cannot start KYC");
    }
    if (!user.otp_verified) {
        throw err("VALIDATION_ERROR", "Phone must be verified with OTP before KYC");
    }
    const trialCount = await countVerificationTrialsLast24h(userId);
    if (trialCount >= MAX_VERIFICATION_TRIALS_PER_24H) {
        throw err(
            "RATE_LIMIT",
            `Maximum ${MAX_VERIFICATION_TRIALS_PER_24H} verification trials per 24 hours. Try again later.`
        );
    }

    const externalId = String(userId);

    if (KYC_PROVIDER === "VERIFF") {
        if (!veriffService.isConfigured()) throw err("CONFIG_ERROR", "Veriff is not configured");
        const session = await veriffService.createSession({
            userId: externalId,
            vendorData: `userId:${externalId}`,
        });
        await kycSessionsDb.insertSession({
            userId,
            provider: "VERIFF",
            providerSessionId: session.sessionId,
            providerExternalId: externalId,
            sessionUrl: session.sessionUrl,
            status: "CREATED",
        });
        await pool.query(
            "UPDATE users SET kyc_status = ?, kyc_level = 1, kyc_provider = ? WHERE id = ?",
            ["pending", "VERIFF", userId]
        );
        return {
            provider: "VERIFF",
            sessionUrl: session.sessionUrl,
            sessionId: session.sessionId,
        };
    }

    if (KYC_PROVIDER === "SUMSUB") {
        if (!sumsubService.isConfigured()) throw err("CONFIG_ERROR", "Sumsub is not configured");
        const { token, applicantId } = await sumsubService.createAccessToken({ userId: externalId });
        await kycSessionsDb.insertSession({
            userId,
            provider: "SUMSUB",
            providerApplicantId: applicantId,
            providerExternalId: externalId,
            status: "CREATED",
        });
        await pool.query(
            "UPDATE users SET kyc_status = ?, kyc_level = 1, kyc_provider = ? WHERE id = ?",
            ["pending", "SUMSUB", userId]
        );
        return {
            provider: "SUMSUB",
            accessToken: token,
            applicantId: applicantId || externalId,
        };
    }

    throw err("CONFIG_ERROR", "Invalid KYC_PROVIDER");
}

/**
 * Handle Veriff event webhook (session_started, session_submitted).
 * UI progress only - never marks verified.
 */
async function handleVeriffEvents(payload) {
    const parsed = veriffService.parseEventPayload(payload);
    const { action, sessionId } = parsed;
    if (!sessionId) throw err("VALIDATION_ERROR", "Missing session id in event payload");

    const session = await kycSessionsDb.findByProviderSessionId("VERIFF", sessionId);
    if (!session) throw Object.assign(new Error("Session not found"), { code: "SESSION_NOT_FOUND" });

    if (action === "started") {
        await kycSessionsDb.updateSession(session.id, { status: "STARTED" });
        return { ok: true, sessionId, status: "STARTED" };
    }
    if (action === "submitted") {
        await kycSessionsDb.updateSession(session.id, { status: "SUBMITTED" });
        return { ok: true, sessionId, status: "SUBMITTED" };
    }
    return { ok: true, sessionId, action };
}

/**
 * Handle Veriff decision webhook.
 * Maps: approved -> VERIFIED, declined -> REJECTED, resubmission_requested/review -> PENDING
 */
async function handleVeriffDecision(payload) {
    const parsed = veriffService.parseDecisionPayload(payload);
    const { status, sessionId, externalId, reasonCode, reason, labels } = parsed;
    if (!sessionId) throw err("VALIDATION_ERROR", "Missing sessionId in webhook payload");
    const session = await kycSessionsDb.findByProviderSessionId("VERIFF", sessionId);
    if (!session) {
        throw Object.assign(new Error("Session not found"), { code: "SESSION_NOT_FOUND" });
    }
    const userId = String(session.user_id);
    if (externalId) {
        const vendorUserId = String(externalId).startsWith("userId:") ? String(externalId).slice(7) : String(externalId);
        if (vendorUserId !== userId) {
            throw err("VALIDATION_ERROR", "Session user mismatch");
        }
    }

    const normalizedStatus = (status || "").toLowerCase();
    const approved = /approved|ok|green/i.test(normalizedStatus);
    const declined = /declined|rejected|red/i.test(normalizedStatus);
    const resubmission = /resubmission|retry/i.test(normalizedStatus);
    const review = /review/i.test(normalizedStatus);
    const expired = /expired/i.test(normalizedStatus);
    const abandoned = /abandoned/i.test(normalizedStatus);

    const reasonStr = reason || (labels && labels.length ? labels.join(", ") : null) || "Verification declined";

    if (approved) {
        const person = payload?.verification?.person || {};
        const docFullName = person.fullName || [person.firstName, person.lastName].filter(Boolean).join(" ").trim() || null;
        const docDob = person.dateOfBirth ? String(person.dateOfBirth).slice(0, 10) : null;
        const docDisplayName = docFullName ? docFullName.trim().slice(0, 100) : null;
        if (docFullName || docDob) {
            await pool.query(
                "UPDATE users SET kyc_status = ?, kyc_level = 2, kyc_verified_at = CURRENT_TIMESTAMP, kyc_last_reason = NULL, full_name = COALESCE(?, full_name), dob = COALESCE(?, dob), display_name = COALESCE(?, display_name) WHERE id = ?",
                ["verified", docFullName || null, docDob || null, docDisplayName || null, userId]
            );
        } else {
            await pool.query(
                "UPDATE users SET kyc_status = ?, kyc_level = 2, kyc_verified_at = CURRENT_TIMESTAMP, kyc_last_reason = NULL WHERE id = ?",
                ["verified", userId]
            );
        }
        await kycSessionsDb.updateSession(session.id, { status: "APPROVED", reason_code: reasonCode || null, reason: null });
        return { ok: true, userId, status: "VERIFIED" };
    }

    if (declined) {
        await pool.query(
            "UPDATE users SET kyc_status = ?, kyc_level = 1, kyc_last_reason = ? WHERE id = ?",
            ["rejected", reasonStr, userId]
        );
        await kycSessionsDb.updateSession(session.id, {
            status: "DECLINED",
            reason_code: reasonCode || null,
            reason: reasonStr,
            reject_labels: labels,
            reject_reason_summary: reasonStr,
        });
        const isDuplicateDoc = /duplicate|already.?used|document.?already/i.test(reasonStr);
        if (isDuplicateDoc) {
            const banDb = require("../moderation/ban.mysql");
            const docHash = payload?.documentNumber ? hashValue(String(payload.documentNumber)) : hashValue(sessionId);
            if (docHash) {
                await banDb.insertBan({ type: "DOC_HASH", value_hash: docHash, reason: "Duplicate document (Veriff)" }).catch(() => {});
            }
        }
        return { ok: true, userId, status: "REJECTED", reason: reasonStr };
    }

    if (resubmission || review) {
        await pool.query(
            "UPDATE users SET kyc_status = ?, kyc_level = 1, kyc_last_reason = ? WHERE id = ?",
            ["pending", reasonStr, userId]
        );
        await kycSessionsDb.updateSession(session.id, {
            status: resubmission ? "RESUBMISSION_REQUESTED" : "REVIEW",
            reason_code: reasonCode || null,
            reason: reasonStr,
            reject_labels: labels,
            reject_reason_summary: reasonStr,
        });
        return { ok: true, userId, status: "PENDING", reason: reasonStr };
    }

    if (expired || abandoned) {
        await kycSessionsDb.updateSession(session.id, {
            status: expired ? "EXPIRED" : "ABANDONED",
            reason_code: reasonCode || null,
            reason: reasonStr,
        });
    }
    return { ok: true, userId, status: normalizedStatus };
}

/**
 * Handle Sumsub applicantReviewed webhook.
 */
async function handleSumsubApplicantReviewed(payload) {
    const parsed = sumsubService.parseApplicantReviewedPayload(payload);
    const { reviewAnswer, applicantId, externalUserId, rejectLabels, moderationComment, reviewRejectType } = parsed;
    let session = applicantId ? await kycSessionsDb.findByProviderApplicantId("SUMSUB", applicantId) : null;
    if (!session && externalUserId) {
        session = await kycSessionsDb.findByProviderExternalId("SUMSUB", String(externalUserId));
    }
    const userId = session ? String(session.user_id) : (externalUserId ? String(externalUserId) : null);
    if (!userId) {
        return { ok: false, reason: "session_not_found" };
    }
    return await applySumsubResult(userId, session?.id, applicantId, reviewAnswer, rejectLabels, moderationComment, reviewRejectType);
}

async function applySumsubResult(userId, sessionId, applicantId, reviewAnswer, rejectLabels, moderationComment, reviewRejectType) {
    const green = /green/i.test(reviewAnswer || "");
    const red = /red/i.test(reviewAnswer || "");

    const rejectReason = moderationComment || (rejectLabels && rejectLabels.length ? rejectLabels.join(", ") : "Verification declined");
    const isDuplicateDoc = rejectLabels && rejectLabels.some((l) => /duplicate|DOCUMENT_DUPLICATE/i.test(String(l)));

    if (green) {
        await pool.query(
            "UPDATE users SET kyc_status = ?, kyc_level = 2, kyc_verified_at = CURRENT_TIMESTAMP, kyc_last_reason = NULL WHERE id = ?",
            ["verified", userId]
        );
        if (sessionId) await kycSessionsDb.updateSession(sessionId, { status: "VERIFIED" });
        return { ok: true, userId, status: "VERIFIED" };
    }

    if (red) {
        const isRetry = /retry/i.test(reviewRejectType || "");
        await pool.query(
            "UPDATE users SET kyc_status = ?, kyc_level = 0, kyc_last_reason = ? WHERE id = ?",
            [isRetry ? "pending" : "rejected", rejectReason, userId]
        );
        if (sessionId) {
            await kycSessionsDb.updateSession(sessionId, {
                status: "REJECTED",
                reject_labels: rejectLabels,
                reject_reason_summary: rejectReason,
            });
        }

        if (isDuplicateDoc) {
            const banDb = require("../moderation/ban.mysql");
            const docHash = hashValue(String(userId) + (applicantId || ""));
            await banDb.insertBan({ type: "DOC_HASH", value_hash: docHash, reason: "Duplicate document (Sumsub)" }).catch(() => {});
        }
        return { ok: true, userId, status: isRetry ? "RESUBMISSION_REQUESTED" : "REJECTED", reason: rejectReason };
    }

    return { ok: true, userId, status: reviewAnswer || "UNKNOWN" };
}

/**
 * Sync Veriff decision (pull from API when webhook missed).
 * @param {string} userId - Our user ID
 * @returns {Promise<{kycStatus:string, updated:boolean}>}
 */
async function veriffSyncDecision(userId) {
    if (KYC_PROVIDER !== "VERIFF") {
        return { kycStatus: (await userDb.getById(userId))?.kyc_status || "none", updated: false };
    }
    const session = await kycSessionsDb.findLatestByUserId("VERIFF", userId);
    if (!session) return { kycStatus: (await userDb.getById(userId))?.kyc_status || "none", updated: false };

    const decisionPayload = await veriffService.getDecision(session.provider_session_id);
    if (!decisionPayload) {
        return { kycStatus: (await userDb.getById(userId))?.kyc_status || "none", updated: false };
    }

    const pollResult = { fetchedAt: new Date().toISOString(), payload: decisionPayload };
    await kycSessionsDb.updateSession(session.id, {
        last_decision_poll_at: new Date(),
        last_decision_poll_result: pollResult,
    });

    const parsed = veriffService.parseDecisionPayload(decisionPayload);
    const status = (parsed.status || "").toString().trim();
    const approved = /approved|ok|green/i.test(status);
    const declined = /declined|rejected|red/i.test(status);
    const resubmission = /resubmission|retry/i.test(status);

    if (!approved && !declined && !resubmission) {
        return { kycStatus: (await userDb.getById(userId))?.kyc_status || "none", updated: false };
    }

    await handleVeriffDecision(decisionPayload);
    const user = await userDb.getById(userId);
    return { kycStatus: user?.kyc_status || "pending", updated: true };
}

module.exports = {
    isProviderKycEnabled,
    getProvider,
    startKyc,
    handleVeriffEvents,
    handleVeriffDecision,
    handleSumsubApplicantReviewed,
    veriffSyncDecision,
};
