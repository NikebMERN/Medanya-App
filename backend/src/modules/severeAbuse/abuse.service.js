// src/modules/severeAbuse/abuse.service.js
const Abuse = require("./abuse.model");
const mask = require("../../utils/mask.util");
const logger = require("../../utils/logger.util");

let notificationService = null;
try {
    notificationService = require("../notifications/notification.service");
} catch (_) {
    notificationService = null;
}

function err(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function userIdFromReqUser(user) {
    return String(user?.id ?? user?.userId ?? "");
}

function validateUrls(arr, max = 10) {
    if (!arr) return [];
    if (!Array.isArray(arr))
        throw err("VALIDATION_ERROR", "evidenceUrls must be arrays");
    if (arr.length > max)
        throw err("VALIDATION_ERROR", `Too many evidence URLs (max ${max})`);
    for (const u of arr) {
        if (typeof u !== "string" || u.length > 2000)
            throw err("VALIDATION_ERROR", "Invalid evidence URL");
    }
    return arr;
}

// Strong anti-spam: same reporter+category within 10 minutes OR same accused phone within 10 minutes
async function spamCheck({
    reporterId,
    anonymous,
    category,
    accusedPhoneNumber,
}) {
    const since = new Date(Date.now() - 10 * 60 * 1000);

    // anonymous: only phone/category throttle (if phone provided)
    if (anonymous) {
        if (!accusedPhoneNumber) return;
        const count = await Abuse.countDocuments({
            anonymous: true,
            accusedPhoneNumber,
            category,
            createdAt: { $gte: since },
        });
        if (count >= 1)
            throw err("RATE_LIMIT", "Too many submissions. Please wait.");
        return;
    }

    // non-anonymous: throttle reporter
    const q = { reporterId, category, createdAt: { $gte: since } };
    const count = await Abuse.countDocuments(q);
    if (count >= 1) throw err("RATE_LIMIT", "Too many submissions. Please wait.");
}

function toPublicItem(doc) {
    const d = doc.toObject ? doc.toObject() : doc;

    // Heavily masked public output
    return {
        id: String(d._id),
        category: d.category,
        description: d.description?.slice(0, 800) || "",
        contentWarning: d.contentWarning || "Sensitive content",
        createdAt: d.createdAt,

        // mask accused fields if present
        accusedName: d.accusedName ? (mask.maskName?.(d.accusedName) ?? "") : "",
        accusedPhoneNumber: d.accusedPhoneNumber
            ? (mask.maskPhone?.(d.accusedPhoneNumber) ?? "")
            : "",

        // do NOT expose exact GPS publicly
        location: d.gps?.lat && d.gps?.lng ? "Location provided" : "Not provided",
    };
}

async function createReport(reqUser, payload = {}) {
    const anonymous = Boolean(payload.anonymous);

    // JWT optional: if anonymous, allow without reqUser
    const reporterId = anonymous ? null : userIdFromReqUser(reqUser);
    if (!anonymous && !reporterId)
        throw err("UNAUTHORIZED", "Login required (or set anonymous=true)");

    const legalDisclaimerAccepted = Boolean(payload.legalDisclaimerAccepted);
    if (!legalDisclaimerAccepted)
        throw err("VALIDATION_ERROR", "legalDisclaimerAccepted must be true");

    const category = payload.category;
    if (
        ![
            "physical_abuse",
            "sexual_harassment",
            "trafficking",
            "forced_labor",
            "other",
        ].includes(category)
    ) {
        throw err("VALIDATION_ERROR", "Invalid category");
    }

    const description = String(payload.description || "").trim();
    if (description.length < 20)
        throw err("VALIDATION_ERROR", "description too short (min 20 chars)");
    if (description.length > 5000)
        throw err("VALIDATION_ERROR", "description too long (max 5000 chars)");

    const accusedPhoneNumber = payload.accusedPhoneNumber
        ? String(payload.accusedPhoneNumber).trim()
        : "";
    const accusedName = payload.accusedName
        ? String(payload.accusedName).trim()
        : "";

    const gps =
        payload.gps && typeof payload.gps === "object"
            ? {
                lat:
                    typeof payload.gps.lat === "number" ? payload.gps.lat : undefined,
                lng:
                    typeof payload.gps.lng === "number" ? payload.gps.lng : undefined,
            }
            : undefined;

    const evidenceUrls = payload.evidenceUrls || {};
    const photos = validateUrls(evidenceUrls.photos, 10);
    const videos = validateUrls(evidenceUrls.videos, 5);
    const voice = validateUrls(evidenceUrls.voice, 5);

    const contentWarning = payload.contentWarning
        ? String(payload.contentWarning).slice(0, 200)
        : "Sensitive content";

    await spamCheck({ reporterId, anonymous, category, accusedPhoneNumber });

    const doc = await Abuse.create({
        reporterId,
        anonymous,
        accusedPhoneNumber,
        accusedName,
        gps,
        category,
        description,
        evidenceUrls: { photos, videos, voice },
        status: "pending",
        contentWarning,
        legalDisclaimerAccepted,
    });

    // Notify admin (best effort)
    try {
        if (notificationService?.sendToTopic) {
            await notificationService.sendToTopic({
                topic: "admins",
                title: "New Severe Abuse Report",
                body: `Category: ${category} (pending review)`,
                data: { type: "severe_abuse", reportId: String(doc._id) },
            });
        }
    } catch (e) {
        logger.warn("Admin notification failed (ignored): " + (e?.message || e));
    }

    return doc;
}

async function listPublic({ page = 1, limit = 20, category } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const skip = (p - 1) * l;

    const q = { status: "approved" };
    if (category) q.category = category;

    const [items, total] = await Promise.all([
        Abuse.find(q).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
        Abuse.countDocuments(q),
    ]);

    return {
        page: p,
        limit: l,
        total,
        items: items.map(toPublicItem),
    };
}

async function listMine(reqUser, { page = 1, limit = 20 } = {}) {
    const reporterId = userIdFromReqUser(reqUser);
    if (!reporterId) throw err("UNAUTHORIZED", "Login required");

    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const skip = (p - 1) * l;

    // Only non-anonymous reports are attributable
    const q = { reporterId, anonymous: false };

    const [items, total] = await Promise.all([
        Abuse.find(q).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
        Abuse.countDocuments(q),
    ]);

    return { page: p, limit: l, total, items };
}

async function adminList({
    status = "pending",
    page = 1,
    limit = 20,
    category,
} = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (p - 1) * l;

    const q = {};
    if (status) q.status = status;
    if (category) q.category = category;

    const [items, total] = await Promise.all([
        Abuse.find(q).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
        Abuse.countDocuments(q),
    ]);

    return { page: p, limit: l, total, items };
}

async function approve(id) {
    const doc = await Abuse.findById(id);
    if (!doc) throw err("NOT_FOUND", "Report not found");

    doc.status = "approved";
    await doc.save();
    return doc;
}

async function reject(id, note = "") {
    const doc = await Abuse.findById(id);
    if (!doc) throw err("NOT_FOUND", "Report not found");

    doc.status = "rejected";
    if (note) doc.contentWarning = String(note).slice(0, 200);
    await doc.save();
    return doc;
}

module.exports = {
    createReport,
    listPublic,
    listMine,
    adminList,
    approve,
    reject,
};
