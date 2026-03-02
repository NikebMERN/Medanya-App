// src/modules/kyc/kyc.service.js
const crypto = require("crypto");
const db = require("./kyc.mysql");
const userDb = require("../users/user.mysql");
const { runVerificationPipeline } = require("../../services/kycVerification.service");

const DOC_TYPES = new Set(["passport", "fayda", "resident_id", "other"]);
const SALT = process.env.KYC_HASH_SALT || "medanya-kyc-salt-v1";
const ENCRYPT_KEY = process.env.KYC_ENCRYPT_KEY || process.env.KYC_HASH_SALT || "medanya-kyc-encrypt-v1";
const IV_LEN = 16;

function err(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function getUserId(reqUser) {
    const id = reqUser?.id ?? reqUser?.userId;
    if (!id) throw err("UNAUTHORIZED", "Auth required");
    return String(id);
}

function hashDocNumber(value) {
    if (!value || typeof value !== "string") return null;
    return crypto
        .createHmac("sha256", SALT)
        .update(value.trim())
        .digest("hex");
}

function last4(value) {
    if (!value || typeof value !== "string") return null;
    const s = value.trim().replace(/\D/g, "");
    return s.length >= 4 ? s.slice(-4) : null;
}

function normalizeFaydaFin(value) {
    if (!value || typeof value !== "string") return "";
    return value.replace(/\D/g, "");
}

function isValidFaydaFin(value) {
    const digits = normalizeFaydaFin(value);
    return digits.length === 12 && /^\d{12}$/.test(digits);
}

function encryptDocNumber(value) {
    if (!value || typeof value !== "string") return null;
    const key = crypto.scryptSync(ENCRYPT_KEY, "medanya-kyc", 32);
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let enc = cipher.update(value.trim(), "utf8", "hex");
    enc += cipher.final("hex");
    return iv.toString("hex") + ":" + enc;
}

async function submit(reqUser, { docType, docNumber, frontImageUrl, backImageUrl, selfieImageUrl, fullName, birthdate, consent }) {
    const userId = getUserId(reqUser);
    if (!consent) throw err("VALIDATION_ERROR", "Consent required for KYC submission");
    const docNum = docNumber != null ? String(docNumber).trim() : "";
    if (!docNum) throw err("VALIDATION_ERROR", "Document number is required");

    const fullNameVal = fullName != null ? String(fullName).trim().slice(0, 120) : null;
    const birthdateVal = birthdate ? (new Date(birthdate).toISOString().slice(0, 10)) : null;

    const doc = DOC_TYPES.has(docType) ? docType : "other";
    let normalizedDocNum = docNum;
    if (doc === "fayda") {
        if (!isValidFaydaFin(docNum)) throw err("VALIDATION_ERROR", "Fayda FIN must be exactly 12 digits. Enter the number from the back of your card.");
        normalizedDocNum = normalizeFaydaFin(docNum);
    }
    const docHash = hashDocNumber(normalizedDocNum);
    const last4Val = last4(normalizedDocNum);
    const docNumberEncrypted = encryptDocNumber(normalizedDocNum);

    let cloudinaryUrlPrivate = null;
    if (frontImageUrl) cloudinaryUrlPrivate = frontImageUrl;
    if (backImageUrl) cloudinaryUrlPrivate = cloudinaryUrlPrivate ? `${cloudinaryUrlPrivate}|${backImageUrl}` : backImageUrl;
    if (!cloudinaryUrlPrivate) throw err("VALIDATION_ERROR", "At least one document image required");
    const selfieUrl = selfieImageUrl ? String(selfieImageUrl).trim().slice(0, 600) : null;

    const existingCount = await db.countByDocHash(docHash, userId);
    if (existingCount > 0) {
        throw err("VALIDATION_ERROR", "This document is already registered to another account. One person, one document.");
    }

    if (fullNameVal) {
        const legalNameNorm = db.normalizeLegalName(fullNameVal);
        const legalNameDuplicate = await db.countByLegalName(legalNameNorm, userId);
        if (legalNameDuplicate > 0) {
            throw err("VALIDATION_ERROR", "This legal name (first, middle, last) is already registered to another account. One person, one identity.");
        }
    }

    const id = await db.insertSubmission({
        user_id: userId,
        doc_type: doc,
        doc_hash: docHash,
        last4: last4Val,
        doc_number_encrypted: docNumberEncrypted,
        cloudinary_url_private: cloudinaryUrlPrivate,
        selfie_image_url: selfieUrl,
        full_name: fullNameVal,
        birthdate: birthdateVal,
        status: "pending_auto",
    });

    let result;
    try {
        result = await runVerificationPipeline(id, { docNumberForCompare: normalizedDocNum, docType: doc });
    } catch (e) {
        await db.updateById(id, { status: "pending_manual" });
        await userDb.updateKyc(userId, { kyc_status: "pending_manual", kyc_level: 0 });
        throw e;
    }

    const sub = await db.findById(id);
    const p1 = result?.p1 || {};
    const p2 = result?.p2 || {};
    const p3 = result?.p3 || {};
    const dataMismatch = !p2.pass || !p3.pass;
    const faceMismatch = !p1.pass;
    const verified = result?.allPass || false;
    const extractedDob = p3.extractedDob ? p3.extractedDob.toISOString().slice(0, 10) : null;

    return {
        id: sub.id,
        submissionId: sub.id,
        status: sub.status,
        doc_type: sub.doc_type,
        created_at: sub.created_at,
        verification: result ? { allPass: result.allPass, status: result.status } : undefined,
        verified,
        dataMismatch,
        faceMismatch,
        requireDataChange: dataMismatch,
        extractedName: p2.extractedName || sub.full_name,
        extractedDob: extractedDob || sub.birthdate,
    };
}

async function startProviderKyc(reqUser) {
    const providerService = require("./kyc.provider.service");
    if (!providerService.isProviderKycEnabled()) {
        throw err("CONFIG_ERROR", "Provider KYC is not enabled. Use legacy flow.");
    }
    const userId = getUserId(reqUser);
    const user = await userDb.getById(userId, { forSelf: false });
    if (!user) throw err("NOT_FOUND", "User not found");
    return providerService.startKyc(userId, user);
}

async function startVeriffKyc(reqUser) {
    const providerService = require("./kyc.provider.service");
    if (providerService.getProvider() !== "VERIFF") {
        throw err("CONFIG_ERROR", "Veriff KYC is not configured. Set KYC_PROVIDER=veriff.");
    }
    const userId = getUserId(reqUser);
    const user = await userDb.getById(userId, { forSelf: false });
    if (!user) throw err("NOT_FOUND", "User not found");
    return providerService.startKyc(userId, user);
}

async function getStatus(reqUser) {
    const userId = getUserId(reqUser);
    const user = await userDb.getById(userId);
    if (!user) throw err("NOT_FOUND", "User not found");

    const latest = await db.findLatestByUserId(userId);
    const kycStatus = user.kyc_status || "none";
    const kycLevel = user.kyc_level ?? 0;

    const out = {
        kycStatus,
        kycLevel,
        provider: user.kyc_provider || null,
        lastReason: user.kyc_last_reason || null,
        kycVerifiedAt: user.kyc_verified_at || null,
        latestSubmission: latest
            ? {
                  id: latest.id,
                  doc_type: latest.doc_type,
                  status: latest.status,
                  created_at: latest.created_at,
                  reviewed_at: latest.reviewed_at,
                  reject_reason: latest.reject_reason,
              }
            : null,
    };
    return out;
}

async function adminGetSubmission(id) {
    const sub = await db.findById(id);
    if (!sub) return null;
    const user = await userDb.getById(sub.user_id, { forSelf: false });
    return {
        id: sub.id,
        user_id: sub.user_id,
        doc_type: sub.doc_type,
        status: sub.status,
        doc_front_url: (sub.cloudinary_url_private || "").split("|")[0] || null,
        doc_back_url: (sub.cloudinary_url_private || "").split("|")[1] || null,
        selfie_url: sub.selfie_image_url,
        cloudinary_url_private: sub.cloudinary_url_private,
        selfie_image_url: sub.selfie_image_url,
        full_name: sub.full_name,
        birthdate: sub.birthdate,
        extracted_name: sub.extracted_name,
        extracted_dob: sub.extracted_dob,
        face_match_score: sub.face_match_score,
        name_match_score: sub.name_match_score,
        reject_reason: sub.reject_reason,
        created_at: sub.created_at,
        user: user ? { display_name: user.display_name, phone_number: user.phone_number } : null,
    };
}

async function adminListByStatus(status, query) {
    return db.listByStatus(status, query);
}

async function adminApprove(submissionId, adminUserId, { faceVerified = false } = {}) {
    const sub = await db.findById(submissionId);
    if (!sub) throw err("NOT_FOUND", "KYC submission not found");
    if (sub.status !== "pending" && sub.status !== "pending_manual") throw err("VALIDATION_ERROR", "Submission already processed");

    await db.updateById(submissionId, {
        status: "verified_manual",
        reviewed_by: adminUserId,
        reviewed_at: new Date(),
        reject_reason: null,
    });

    await userDb.updateKyc(sub.user_id, {
        kyc_status: "verified_manual",
        kyc_level: 2,
        kyc_face_verified: !!faceVerified,
    });

    return db.findById(submissionId);
}

async function adminReject(submissionId, adminUserId, reason) {
    const sub = await db.findById(submissionId);
    if (!sub) throw err("NOT_FOUND", "KYC submission not found");
    if (sub.status !== "pending" && sub.status !== "pending_manual") throw err("VALIDATION_ERROR", "Submission already processed");

    await db.updateById(submissionId, {
        status: "rejected",
        reviewed_by: adminUserId,
        reviewed_at: new Date(),
        reject_reason: String(reason || "").trim().slice(0, 255) || null,
    });

    return db.findById(submissionId);
}

async function confirmDataChange(reqUser, submissionId) {
    const userId = getUserId(reqUser);
    const sub = await db.findById(submissionId);
    if (!sub) throw err("NOT_FOUND", "KYC submission not found");
    if (String(sub.user_id) !== String(userId)) throw err("FORBIDDEN", "Not your submission");

    const fullNameVal = sub.full_name || null;
    const dobVal = sub.birthdate || null;
    const displayNameVal = fullNameVal ? fullNameVal.trim().slice(0, 100) : null;

    await userDb.updateById(userId, {
        full_name: fullNameVal,
        dob: dobVal,
        display_name: displayNameVal,
        account_private: 1,
        hide_personal_data: 1,
    });

    const faceMatchScore = sub.face_match_score;
    const facePassed = faceMatchScore != null && Number(faceMatchScore) >= 0.85;
    if (facePassed) {
        await db.updateById(submissionId, {
            status: "verified_auto",
            name_match_score: 1,
        });
        await userDb.updateKyc(userId, {
            kyc_status: "verified_auto",
            kyc_level: 2,
            kyc_face_verified: 1,
        });
    }

    const updatedUser = await userDb.getById(userId, { forSelf: true });
    return {
        success: true,
        verified: facePassed,
        submissionId,
        user: updatedUser,
    };
}

/**
 * Admin: list users with their KYC status (why verified or why failed).
 * No sensitive data, no OTP required.
 */
async function adminListUsersWithKycStatus(query) {
    const { pool } = require("../../config/mysql");
    const ListingReport = require("../reports/listingReport.model");
    const { computeUserRiskScore, getRiskLabel } = require("../../utils/riskScore.util");
    const trustScoreService = require("../../services/trustScore.service");
    const p = Math.max(parseInt(query.page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 100);
    const offset = (p - 1) * l;
    const q = String(query.query || "").trim();
    const like = q ? `%${q}%` : null;
    const verifiedOnly =
        query.verifiedOnly === true ||
        query.verifiedOnly === "true" ||
        query.verifiedOnly === "1" ||
        query.verifiedOnly === 1;
    const faceVerifiedOnly =
        query.faceVerifiedOnly === true ||
        query.faceVerifiedOnly === "true" ||
        query.faceVerifiedOnly === "1" ||
        query.faceVerifiedOnly === 1;
    const statusFilter = String(query.status || "").toLowerCase();

    const filters = [];
    const baseParams = [];
    if (like) {
        filters.push("(u.phone_number LIKE ? OR u.display_name LIKE ? OR CAST(u.id AS CHAR) LIKE ?)");
        baseParams.push(like, like, like);
    }
    if (statusFilter === "pending") {
        filters.push("u.kyc_status = 'pending'");
    } else if (statusFilter === "approved" || statusFilter === "verified") {
        filters.push("u.kyc_status IN ('verified_auto','verified_manual','verified')");
    } else if (statusFilter === "rejected") {
        filters.push("u.kyc_status = 'rejected'");
    }
    if (verifiedOnly && !statusFilter) {
        filters.push("u.kyc_status IN ('verified_auto','verified_manual','verified')");
    }
    if (faceVerifiedOnly) {
        filters.push("u.kyc_face_verified = 1");
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const countParams = [...baseParams];
    const listParams = [...baseParams, l, offset];

    const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM users u ${where}`,
        countParams
    );
    const [rows] = await pool.query(
        `SELECT u.id, u.display_name, u.phone_number, u.otp_verified, u.created_at, u.is_banned,
                u.kyc_status, u.kyc_level, u.kyc_face_verified, u.kyc_provider, u.kyc_verified_at, u.kyc_last_reason,
                k.id AS submission_id, k.status AS submission_status, k.reject_reason, k.created_at AS submission_created_at,
                k.face_match_score, k.name_match_score, k.doc_quality_ok, k.doc_hash_duplicate
         FROM users u
         LEFT JOIN (
           SELECT k1.* FROM kyc_submissions k1
           INNER JOIN (SELECT user_id, MAX(id) AS mid FROM kyc_submissions GROUP BY user_id) k2
           ON k1.user_id = k2.user_id AND k1.id = k2.mid
         ) k ON k.user_id = u.id
         ${where}
         ORDER BY u.id DESC
         LIMIT ? OFFSET ?`,
        listParams
    );
    const users = await Promise.all(
        rows.map(async (r) => {
            const reportsCount = await ListingReport.countDocuments({
                targetType: "user",
                targetId: String(r.id),
            }).catch(() => 0);
            const trustScore = await trustScoreService.getTrustScore(r.id);
            const bars = await computeUserRiskScore(
                {
                    otp_verified: !!r.otp_verified,
                    kyc_status: r.kyc_status || "none",
                    created_at: r.created_at,
                },
                { reportsCount, trustScore, deviceRisk: 0 }
            );
            const timeResolved = r.kyc_verified_at || r.submission_created_at || r.created_at;
            return {
                id: r.id,
                display_name: r.display_name,
                phone_masked: r.phone_number ? `${String(r.phone_number).slice(0, 4)}****` : null,
                account: r.display_name ? `${r.display_name} (ID ${r.id})` : `ID ${r.id}`,
                kyc_status: r.kyc_status || "none",
                kyc_level: r.kyc_level ?? 0,
                kyc_face_verified: !!r.kyc_face_verified,
                kyc_provider: r.kyc_provider || null,
                kyc_verified_at: r.kyc_verified_at || null,
                kyc_last_reason: r.kyc_last_reason || null,
                time_resolved: timeResolved ? new Date(timeResolved).toISOString() : null,
                verification_reason: getVerificationReason(r),
                reject_reason: r.reject_reason || r.kyc_last_reason || null,
                is_banned: !!r.is_banned,
                risk_score: bars,
                risk_label: getRiskLabel(bars),
            };
        })
    );
    return { users, total: countRow.total, page: p, limit: l };
}

function getVerificationReason(row) {
    if (!row) return null;
    const status = row.submission_status || row.kyc_status;
    if (["verified_auto", "verified_manual", "verified"].includes(status)) {
        const parts = [];
        if (row.face_match_score >= 0.85) parts.push("Face matched");
        if (row.name_match_score >= 0.8) parts.push("Name matched");
        if (!row.doc_hash_duplicate) parts.push("Doc not duplicated");
        return parts.length ? parts.join(", ") : "Manually verified";
    }
    if (status === "rejected") return null;
    return null;
}

const ADMIN_KYC_SESSION_TTL = 20 * 60; // 20 minutes
const ADMIN_KYC_OTP_TTL = 5 * 60; // 5 min to enter OTP

function getAdminTestPhones() {
    const raw = process.env.ADMIN_TEST_PHONES;
    if (!raw || typeof raw !== "string") return new Set();
    return new Set(
        raw
            .split(",")
            .map((s) => String(s).replace(/\D/g, ""))
            .filter((s) => s.length >= 9)
    );
}

/**
 * Admin requests OTP to view a user's KYC data.
 * Sends OTP to admin's phone. Uses dev bypass if admin in ADMIN_TEST_PHONES.
 */
async function adminRequestOtp(adminUser, targetUserId) {
    const { getRedis } = require("../../config/redis");
    const adminId = String(adminUser?.id ?? adminUser?.userId ?? "");
    if (!adminId) throw err("UNAUTHORIZED", "Auth required");
    const userId = String(targetUserId);
    const userDb = require("../users/user.mysql");
    const admin = await userDb.getById(adminId);
    if (!admin || !admin.phone_number) throw err("VALIDATION_ERROR", "Admin must have a phone number to receive OTP");
    const norm = (p) => String(p || "").replace(/\D/g, "");
    const adminNorm = norm(admin.phone_number);
    const testPhones = getAdminTestPhones();
    const isDev = testPhones.has(adminNorm);
    const redis = await getRedis();
    if (!redis) throw err("SERVER_ERROR", "Redis not available");
    const otpKey = `admin_kyc_otp:${adminId}:${userId}`;
    const sessionKey = `admin_kyc_session:${adminId}:${userId}`;
    await redis.del(otpKey);
    await redis.del(sessionKey);
    if (isDev) {
        await redis.setex(otpKey, ADMIN_KYC_OTP_TTL, "dev-bypass");
        return { sent: true, message: "OTP sent. Use ADMIN_TEST_OTP_CODE (default 123456) in development." };
    }
    throw err(
        "OTP_SEND_NOT_CONFIGURED",
        "Production OTP requires integration. Add your phone to ADMIN_TEST_PHONES for development."
    );
}

/**
 * Admin verifies OTP; on success, creates 20-min session for viewing that user's KYC data.
 */
async function adminVerifyOtp(adminUser, targetUserId, code) {
    const { getRedis } = require("../../config/redis");
    const adminId = String(adminUser?.id ?? adminUser?.userId ?? "");
    if (!adminId) throw err("UNAUTHORIZED", "Auth required");
    const userId = String(targetUserId);
    const codeStr = String(code || "").trim();
    if (!codeStr || codeStr.length !== 6) throw err("VALIDATION_ERROR", "Invalid OTP code");
    const redis = await getRedis();
    if (!redis) throw err("SERVER_ERROR", "Redis not available");
    const otpKey = `admin_kyc_otp:${adminId}:${userId}`;
    const sessionKey = `admin_kyc_session:${adminId}:${userId}`;
    const stored = await redis.get(otpKey);
    const devOtp = process.env.ADMIN_TEST_OTP_CODE || "123456";
    const valid = stored === "dev-bypass" && codeStr === devOtp;
    if (!valid) throw err("INVALID_OTP", "Invalid or expired OTP");
    await redis.del(otpKey);
    await redis.setex(sessionKey, ADMIN_KYC_SESSION_TTL, "1");
    return { verified: true, expiresIn: ADMIN_KYC_SESSION_TTL };
}

function hasAdminKycSession(redis, adminId, userId) {
    const key = `admin_kyc_session:${adminId}:${userId}`;
    return redis.get(key).then((v) => !!v);
}

/**
 * Admin gets full KYC data for a user. Requires valid OTP session (20 min).
 */
async function adminGetUserKycData(adminUser, targetUserId) {
    const { getRedis } = require("../../config/redis");
    const adminId = String(adminUser?.id ?? adminUser?.userId ?? "");
    if (!adminId) throw err("UNAUTHORIZED", "Auth required");
    const userId = String(targetUserId);
    const redis = await getRedis();
    if (!redis) throw err("SERVER_ERROR", "Redis not available");
    const hasSession = await hasAdminKycSession(redis, adminId, userId);
    if (!hasSession) throw err("OTP_REQUIRED", "Enter OTP to view this user's KYC data. Request OTP first.");
    const sub = await db.findLatestByUserId(userId);
    const user = await userDb.getById(userId, { forSelf: true });
    if (!user) throw err("NOT_FOUND", "User not found");
    const data = {
        user_id: userId,
        display_name: user.display_name,
        kyc_status: user.kyc_status,
        kyc_face_verified: !!user.kyc_face_verified,
    };
    if (!sub) {
        data.submission = null;
        data.reason = "No KYC submission";
        return data;
    }
    const urlParts = (sub.cloudinary_url_private || "").split("|");
    data.submission = {
        id: sub.id,
        doc_type: sub.doc_type,
        last4: sub.last4,
        full_name: sub.full_name,
        birthdate: sub.birthdate,
        status: sub.status,
        face_match_score: sub.face_match_score,
        name_match_score: sub.name_match_score,
        doc_quality_ok: sub.doc_quality_ok,
        doc_hash_duplicate: sub.doc_hash_duplicate,
        reject_reason: sub.reject_reason,
        created_at: sub.created_at,
        doc_front_url: urlParts[0] || null,
        doc_back_url: urlParts[1] || null,
        selfie_url: sub.selfie_image_url,
    };
    data.verification_reason = getVerificationReason({ ...sub, submission_status: sub.status });
    return data;
}

/**
 * Admin: last 20 webhook events for session. GET /admin/veriff/webhooks?sessionId=
 */
async function adminVeriffWebhooks(sessionId) {
    const webhookEventDb = require("./veriffWebhookEvent.mysql");
    const events = await webhookEventDb.findLast20BySessionId(sessionId);
    return events.map((e) => ({
        id: e.id,
        kind: e.kind,
        session_id: e.session_id,
        received_at: e.received_at,
        signature_valid: !!e.signature_valid,
        error_text: e.error_text,
        payload_raw: e.payload_raw,
        payload_json: e.payload_json,
    }));
}

/**
 * Admin debug endpoint for Veriff session.
 * Returns session, user kyc status, last webhook event, last decision poll result.
 */
async function adminVeriffDebug(sessionId) {
    const kycSessionsDb = require("./kycSessions.mysql");
    const webhookEventDb = require("./veriffWebhookEvent.mysql");
    const { pool } = require("../../config/mysql");
    const sid = String(sessionId || "").trim();
    if (!sid) return null;

    const session = await kycSessionsDb.findByProviderSessionId("VERIFF", sid);
    if (!session) return null;

    const [userRows] = await pool.query(
        "SELECT id, display_name, kyc_status, kyc_level, kyc_verified_at, kyc_last_reason FROM users WHERE id = ?",
        [session.user_id]
    );
    const user = userRows[0] || null;

    const lastWebhookEvent = await webhookEventDb.findLastBySessionId(sid);
    const recentWebhookEvents = await webhookEventDb.findRecentBySessionId(sid, 10);

    return {
        session: {
            id: session.id,
            user_id: session.user_id,
            provider_session_id: session.provider_session_id,
            status: session.status,
            created_at: session.created_at,
            updated_at: session.updated_at,
            last_decision_poll_at: session.last_decision_poll_at,
            last_decision_poll_result: session.last_decision_poll_result,
        },
        user: user ? {
            id: user.id,
            display_name: user.display_name,
            kyc_status: user.kyc_status,
            kyc_level: user.kyc_level,
            kyc_verified_at: user.kyc_verified_at,
            kyc_last_reason: user.kyc_last_reason,
        } : null,
        lastWebhookEvent: lastWebhookEvent ? {
            id: lastWebhookEvent.id,
            received_at: lastWebhookEvent.received_at,
            signature_valid: !!lastWebhookEvent.signature_valid,
            error_text: lastWebhookEvent.error_text,
            payload_json: lastWebhookEvent.payload_json,
        } : null,
        recentWebhookEvents: recentWebhookEvents.map((e) => ({
            id: e.id,
            received_at: e.received_at,
            signature_valid: !!e.signature_valid,
            error_text: e.error_text,
            action: e.payload_json?.action,
            decision: e.payload_json?.verification?.status ?? e.payload_json?.decision ?? e.payload_json?.status,
        })),
    };
}

module.exports = {
    submit,
    startProviderKyc,
    startVeriffKyc,
    getStatus,
    confirmDataChange,
    adminGetSubmission,
    adminListByStatus,
    adminApprove,
    adminReject,
    adminListUsersWithKycStatus,
    adminRequestOtp,
    adminVerifyOtp,
    adminGetUserKycData,
    adminVeriffDebug,
    adminVeriffWebhooks,
};
