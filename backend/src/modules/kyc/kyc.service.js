// src/modules/kyc/kyc.service.js
const crypto = require("crypto");
const db = require("./kyc.mysql");
const userDb = require("../users/user.mysql");
const { cloudinary, isConfigured } = require("../../config/cloudinary");

const DOC_TYPES = new Set(["passport", "fayda", "resident_id", "other"]);
const SALT = process.env.KYC_HASH_SALT || "medanya-kyc-salt-v1";

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

async function submit(reqUser, { docType, docNumber, frontImageUrl, backImageUrl, selfieImageUrl, consent }) {
    const userId = getUserId(reqUser);
    if (!consent) throw err("VALIDATION_ERROR", "Consent required for KYC submission");
    const docNum = docNumber != null ? String(docNumber).trim() : "";
    if (!docNum) throw err("VALIDATION_ERROR", "Document number is required");

    const doc = DOC_TYPES.has(docType) ? docType : "other";
    const docHash = hashDocNumber(docNum);
    const last4Val = last4(docNum);

    let cloudinaryUrlPrivate = null;
    if (frontImageUrl) {
        cloudinaryUrlPrivate = frontImageUrl;
    }
    if (backImageUrl) {
        cloudinaryUrlPrivate = cloudinaryUrlPrivate
            ? `${cloudinaryUrlPrivate}|${backImageUrl}`
            : backImageUrl;
    }
    if (!cloudinaryUrlPrivate) throw err("VALIDATION_ERROR", "At least one document image required");
    const selfieUrl = selfieImageUrl ? String(selfieImageUrl).trim().slice(0, 600) : null;
    if (!selfieUrl) throw err("VALIDATION_ERROR", "Selfie photo is required to match your face with the document");

    const id = await db.insertSubmission({
        user_id: userId,
        doc_type: doc,
        doc_hash: docHash,
        last4: last4Val,
        cloudinary_url_private: cloudinaryUrlPrivate,
        selfie_image_url: selfieUrl,
        status: "pending",
    });

    const sub = await db.findById(id);
    return {
        id: sub.id,
        status: sub.status,
        doc_type: sub.doc_type,
        created_at: sub.created_at,
    };
}

async function getStatus(reqUser) {
    const userId = getUserId(reqUser);
    const user = await userDb.getById(userId);
    if (!user) throw err("NOT_FOUND", "User not found");

    const latest = await db.findLatestByUserId(userId);
    const kycStatus = user.kyc_status || "none";
    const kycLevel = user.kyc_level ?? 0;

    return {
        kycStatus,
        kycLevel,
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
}

async function adminListByStatus(status, query) {
    return db.listByStatus(status, query);
}

async function adminApprove(submissionId, adminUserId, { faceVerified = false } = {}) {
    const sub = await db.findById(submissionId);
    if (!sub) throw err("NOT_FOUND", "KYC submission not found");
    if (sub.status !== "pending") throw err("VALIDATION_ERROR", "Submission already processed");

    await db.updateById(submissionId, {
        status: "approved",
        reviewed_by: adminUserId,
        reviewed_at: new Date(),
        reject_reason: null,
    });

    await userDb.updateKyc(sub.user_id, {
        kyc_status: "verified",
        kyc_level: 2,
        kyc_face_verified: !!faceVerified,
    });

    return db.findById(submissionId);
}

async function adminReject(submissionId, adminUserId, reason) {
    const sub = await db.findById(submissionId);
    if (!sub) throw err("NOT_FOUND", "KYC submission not found");
    if (sub.status !== "pending") throw err("VALIDATION_ERROR", "Submission already processed");

    await db.updateById(submissionId, {
        status: "rejected",
        reviewed_by: adminUserId,
        reviewed_at: new Date(),
        reject_reason: String(reason || "").trim().slice(0, 255) || null,
    });

    return db.findById(submissionId);
}

module.exports = {
    submit,
    getStatus,
    adminListByStatus,
    adminApprove,
    adminReject,
};
