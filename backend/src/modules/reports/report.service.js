// src/modules/reports/report.service.js
const mongoose = require("mongoose");
const Report = require("./report.model");
const { maskPhone, maskName, maskLocation } = require("../../utils/mask.util");

const DUP_WINDOW_MINUTES = 30; // prevent same reporter+phone spam
const MAX_DESC = 1500;
const MAX_EVIDENCE = 6;

const SEVERE_REASONS = new Set([
    "physical_abuse",
    "sexual_harassment",
    "passport_confiscation",
]);
const AUTO_PENDING_REASONS = new Set([
    "physical_abuse",
    "sexual_harassment",
    "passport_confiscation",
]); // admin review

function toId(x) {
    return x === null || x === undefined ? "" : String(x);
}

function codeErr(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function cleanStr(v, max = 200) {
    const s = String(v || "").trim();
    if (!s) return "";
    return s.length > max ? s.slice(0, max) : s;
}

function computeRisk({ total, severeCount }) {
    // Warning: >=2 reports OR severe reason once
    // Dangerous: >=5 reports OR >=2 severe reasons
    if (total >= 5 || severeCount >= 2) return "dangerous";
    return "warning"; // includes severe once or total>=2
}

async function getAggregateByPhone(phoneNumber) {
    const phone = cleanStr(phoneNumber, 40);
    const agg = await Report.aggregate([
        {
            $match: {
                phoneNumber: phone,
                status: "approved",
                targetType: "employer",
            },
        },
        {
            $group: {
                _id: "$phoneNumber",
                totalReports: { $sum: 1 },
                reasons: { $push: "$reason" },
                severeCount: {
                    $sum: {
                        $cond: [{ $in: ["$reason", Array.from(SEVERE_REASONS)] }, 1, 0],
                    },
                },
                latestAt: { $max: "$createdAt" },
                nameSamples: { $addToSet: "$employerName" },
                locationSamples: { $addToSet: "$locationText" },
            },
        },
    ]);

    if (!agg[0]) return null;

    const reasonCounts = agg[0].reasons.reduce((m, r) => {
        m[r] = (m[r] || 0) + 1;
        return m;
    }, {});

    const riskLevel = computeRisk({
        total: agg[0].totalReports,
        severeCount: agg[0].severeCount,
    });

    return {
        phoneNumber: agg[0]._id,
        totalReports: agg[0].totalReports,
        reasons: reasonCounts,
        severeCount: agg[0].severeCount,
        riskLevel,
        latestAt: agg[0].latestAt,
        employerName: (agg[0].nameSamples || []).filter(Boolean)[0] || "",
        locationText: (agg[0].locationSamples || []).filter(Boolean)[0] || "",
    };
}

async function createReport(reporterId, body) {
    const reporter = toId(reporterId);
    if (!reporter) throw codeErr("UNAUTHORIZED", "Auth required");

    const phoneNumber = cleanStr(body.phoneNumber, 40);
    if (!phoneNumber)
        throw codeErr("VALIDATION_ERROR", "phoneNumber is required");

    const reason = cleanStr(body.reason, 50);
    const allowed = [
        "unpaid_salary",
        "fraud_scam",
        "physical_abuse",
        "sexual_harassment",
        "passport_confiscation",
        "other",
    ];
    if (!allowed.includes(reason))
        throw codeErr("VALIDATION_ERROR", "Invalid reason");

    const employerName = cleanStr(body.employerName, 120);
    const locationText = cleanStr(body.locationText, 200);
    const description = cleanStr(body.description, MAX_DESC);

    const gps =
        body.gps && typeof body.gps === "object"
            ? { lat: Number(body.gps.lat), lng: Number(body.gps.lng) }
            : null;

    const photos = Array.isArray(body?.evidence?.photos)
        ? body.evidence.photos.slice(0, MAX_EVIDENCE)
        : [];
    const videos = Array.isArray(body?.evidence?.videos)
        ? body.evidence.videos.slice(0, MAX_EVIDENCE)
        : [];

    // Duplicate spam prevention (same reporter + phone within window)
    const windowStart = new Date(Date.now() - DUP_WINDOW_MINUTES * 60 * 1000);
    const dup = await Report.findOne({
        reporterId: reporter,
        phoneNumber,
        targetType: "employer",
        createdAt: { $gte: windowStart },
    }).lean();
    if (dup)
        throw codeErr(
            "DUPLICATE_SPAM",
            "You recently reported this number. Try later.",
        );

    // Auto-moderation: severe reasons go pending for admin review, others auto-approved
    const status = AUTO_PENDING_REASONS.has(reason) ? "pending" : "approved";

    // Compute risk using current approved reports + this one if approved
    // For pending, compute using approved-only (risk updates when approved later)
    const baseAgg = await Report.aggregate([
        { $match: { phoneNumber, status: "approved", targetType: "employer" } },
        {
            $group: {
                _id: "$phoneNumber",
                total: { $sum: 1 },
                severeCount: {
                    $sum: {
                        $cond: [{ $in: ["$reason", Array.from(SEVERE_REASONS)] }, 1, 0],
                    },
                },
            },
        },
    ]);

    let total = baseAgg[0]?.total || 0;
    let severeCount = baseAgg[0]?.severeCount || 0;

    if (status === "approved") {
        total += 1;
        if (SEVERE_REASONS.has(reason)) severeCount += 1;
    } else {
        // pending: still allow warning if severe once OR total>=2 based on approved-only
        // riskLevel stored on pending for admin visibility (doesn't affect public summary until approved)
    }

    const riskLevel = computeRisk({
        total: Math.max(total, 2),
        severeCount: severeCount || (SEVERE_REASONS.has(reason) ? 1 : 0),
    });

    const created = await Report.create({
        reporterId: reporter,
        phoneNumber,
        employerName,
        locationText,
        gps:
            gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lng) ? gps : null,
        reason,
        description,
        evidence: { photos, videos },
        status,
        riskLevel,
        targetType: "employer",
    });

    return created.toObject();
}

async function listMyReports(reporterId, { page = 1, limit = 20 } = {}) {
    const reporter = toId(reporterId);
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
        Report.find({ reporterId: reporter, targetType: "employer" })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(l)
            .lean(),
        Report.countDocuments({ reporterId: reporter, targetType: "employer" }),
    ]);

    return { page: p, limit: l, total, reports: items };
}

async function searchBlacklist({
    phone,
    name,
    location,
    page = 1,
    limit = 20,
}) {
    // Return aggregated summaries sorted: most reported first (top)
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const skip = (p - 1) * l;

    const match = { status: "approved", targetType: "employer" };

    if (phone) match.phoneNumber = new RegExp(String(phone).trim(), "i");
    if (name) match.employerName = new RegExp(String(name).trim(), "i");
    if (location) match.locationText = new RegExp(String(location).trim(), "i");

    const pipeline = [
        { $match: match },
        {
            $group: {
                _id: "$phoneNumber",
                totalReports: { $sum: 1 },
                severeCount: {
                    $sum: {
                        $cond: [{ $in: ["$reason", Array.from(SEVERE_REASONS)] }, 1, 0],
                    },
                },
                latestAt: { $max: "$createdAt" },
                reasons: { $push: "$reason" },
                employerName: { $first: "$employerName" },
                locationText: { $first: "$locationText" },
            },
        },
        {
            $addFields: {
                riskLevel: {
                    $cond: [
                        {
                            $or: [
                                { $gte: ["$totalReports", 5] },
                                { $gte: ["$severeCount", 2] },
                            ],
                        },
                        "dangerous",
                        "warning",
                    ],
                },
            },
        },
        { $sort: { totalReports: -1, latestAt: -1 } }, // ✅ most reported at top
        { $skip: skip },
        { $limit: l },
    ];

    const items = await Report.aggregate(pipeline);

    // Convert reasons array -> counts
    const mapped = items.map((x) => {
        const reasonCounts = (x.reasons || []).reduce((m, r) => {
            m[r] = (m[r] || 0) + 1;
            return m;
        }, {});
        return {
            phoneNumber: x._id,
            totalReports: x.totalReports,
            reasons: reasonCounts,
            riskLevel: x.riskLevel,
            latestAt: x.latestAt,
            employerName: x.employerName || "",
            locationText: x.locationText || "",
        };
    });

    return { page: p, limit: l, results: mapped };
}

async function getBlacklistSummary(phoneNumber, { reportsLimit = 10 } = {}) {
    const phone = cleanStr(phoneNumber, 40);
    if (!phone) throw codeErr("VALIDATION_ERROR", "phoneNumber required");

    const summary = await getAggregateByPhone(phone);
    if (!summary) {
        return { summary: null, recentReports: [] };
    }

    // Recent reports at bottom of response (chronological) -> fetch latest then reverse
    const recent = await Report.find({
        phoneNumber: phone,
        status: "approved",
        targetType: "employer",
    })
        .sort({ createdAt: -1 })
        .limit(Math.min(Math.max(parseInt(reportsLimit, 10) || 10, 1), 50))
        .lean();

    const recentChrono = recent.slice().reverse(); // ✅ “reported list at bottom” (old->new)

    return { summary, recentReports: recentChrono };
}

// Admin
async function adminListReports({ status, page = 1, limit = 30 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
    const skip = (p - 1) * l;

    const q = { targetType: "employer" };
    if (status) q.status = status;

    const [items, total] = await Promise.all([
        Report.find(q).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
        Report.countDocuments(q),
    ]);

    return { page: p, limit: l, total, reports: items };
}

async function adminApprove(reportId) {
    if (!mongoose.isValidObjectId(reportId))
        throw codeErr("INVALID_REPORT", "Invalid report id");
    const report = await Report.findById(reportId);
    if (!report) throw codeErr("NOT_FOUND", "Report not found");

    report.status = "approved";

    // Recompute risk after approval for this phone
    const agg = await Report.aggregate([
        {
            $match: {
                phoneNumber: report.phoneNumber,
                status: "approved",
                targetType: "employer",
            },
        },
        {
            $group: {
                _id: "$phoneNumber",
                total: { $sum: 1 },
                severeCount: {
                    $sum: {
                        $cond: [{ $in: ["$reason", Array.from(SEVERE_REASONS)] }, 1, 0],
                    },
                },
            },
        },
    ]);

    const total = (agg[0]?.total || 0) + 1;
    const severeCount =
        (agg[0]?.severeCount || 0) + (SEVERE_REASONS.has(report.reason) ? 1 : 0);

    report.riskLevel = computeRisk({ total: Math.max(total, 2), severeCount });
    await report.save();

    return report.toObject();
}

async function adminReject(reportId) {
    if (!mongoose.isValidObjectId(reportId))
        throw codeErr("INVALID_REPORT", "Invalid report id");
    const report = await Report.findById(reportId);
    if (!report) throw codeErr("NOT_FOUND", "Report not found");

    report.status = "rejected";
    await report.save();
    return report.toObject();
}

async function listBlacklistSummariesForFeed({ limit = 25 } = {}) {
    const l = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);

    const pipeline = [
        { $match: { status: "approved", targetType: "employer" } },
        {
            $group: {
                _id: "$phoneNumber",
                totalReports: { $sum: 1 },
                severeCount: {
                    $sum: {
                        $cond: [
                            {
                                $in: [
                                    "$reason",
                                    [
                                        "physical_abuse",
                                        "sexual_harassment",
                                        "passport_confiscation",
                                    ],
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
                latestAt: { $max: "$createdAt" },
                employerName: { $first: "$employerName" },
                locationText: { $first: "$locationText" },
            },
        },
        {
            $addFields: {
                riskLevel: {
                    $cond: [
                        {
                            $or: [
                                { $gte: ["$totalReports", 5] },
                                { $gte: ["$severeCount", 2] },
                            ],
                        },
                        "dangerous",
                        "warning",
                    ],
                },
            },
        },
        { $sort: { latestAt: -1 } },
        { $limit: l },
    ];

    const rows = await Report.aggregate(pipeline);

    // mask sensitive for public feed
    return rows.map((x) => ({
        phoneNumberMasked: maskPhone(x._id),
        employerName: maskName(x.employerName || ""),
        locationText: maskLocation(x.locationText || ""),
        totalReports: x.totalReports,
        riskLevel: x.riskLevel,
        latestAt: x.latestAt,
    }));
}

module.exports = {
    SEVERE_REASONS,
    createReport,
    listMyReports,
    searchBlacklist,
    getBlacklistSummary,
    adminListReports,
    adminApprove,
    adminReject,
    listBlacklistSummariesForFeed,
};
