// src/modules/feed/feedRanking.service.js
// Personalized feed ranking: 70–80% personalized, 20–30% exploration.
const jobsDb = require("../jobs/job.mysql");
const marketDb = require("../marketplace/market.mysql");
const reportService = require("../reports/report.service");
const MissingPerson = require("../missingPersons/missing.model");
const Video = require("../videos/video.model");
const Activity = require("../activity/activity.model");
const followDb = require("../users/follow.mysql");
const contentVisibility = require("./contentVisibility.service");

const RECENCY_WEIGHT = 0.3;
const FOLLOW_CREATOR_WEIGHT = 1.5;
const CATEGORY_MATCH_WEIGHT = 0.8;
const EXPLORATION_RATIO = 0.25; // 25% exploration

function toId(u) {
    return String(u?.id ?? u?.userId ?? "");
}

function toIsoDate(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
}

function makeKey(type, id) {
    return `${type}:${id}`;
}

function normalizeJob(row) {
    return {
        type: "job",
        id: row.id,
        authorId: String(row.created_by || ""),
        category: row.category || "",
        title: row.title,
        summary: `${row.category}${row.salary ? ` • ${row.salary}` : ""}`,
        location: row.location || "",
        createdAt: toIsoDate(row.created_at),
        preview: { category: row.category, salary: row.salary || "", imageUrl: row.image_url || "" },
    };
}

function normalizeMarket(row) {
    const imgUrls = Array.isArray(row.image_urls) ? row.image_urls : row.image_urls ? JSON.parse(row.image_urls || "[]") : [];
    return {
        type: "marketplace",
        id: row.id,
        authorId: String(row.seller_id || ""),
        category: row.category || "",
        title: row.title,
        summary: `${row.category} • ${row.price}`,
        location: row.location || "",
        createdAt: toIsoDate(row.created_at),
        preview: {
            price: row.price,
            category: row.category,
            imageUrl: imgUrls[0] || row.image_url || "",
        },
    };
}

function normalizeMissing(doc) {
    return {
        type: "missing_person",
        id: doc._id.toString(),
        authorId: String(doc.createdBy || ""),
        category: "missing",
        title: doc.fullName ? `Missing: ${doc.fullName}` : "Missing Person Alert",
        summary: doc.description ? (doc.description.length > 90 ? doc.description.slice(0, 90) + "…" : doc.description) : "",
        location: doc.lastKnownLocationText || "",
        createdAt: toIsoDate(doc.createdAt),
        preview: { photoUrl: doc.photoUrl, voiceUrl: doc.voiceUrl || "", status: doc.status },
    };
}

function normalizeReport(s) {
    return {
        type: "report",
        id: s.phoneNumberMasked,
        authorId: "",
        category: "report",
        title: `Reported: ${s.employerName || s.phoneNumberMasked}`,
        summary: `${s.riskLevel.toUpperCase()} • ${s.totalReports} reports`,
        location: s.locationText || "",
        createdAt: toIsoDate(s.latestAt),
        preview: { riskLevel: s.riskLevel, totalReports: s.totalReports, phoneMasked: s.phoneNumberMasked },
    };
}

function normalizeVideo(v) {
    return {
        type: "video",
        id: v._id.toString(),
        authorId: String(v.uploaderId || v.createdBy || ""),
        category: (v.tags || [])[0] || "",
        title: v.caption ? (v.caption.length > 60 ? v.caption.slice(0, 60) + "…" : v.caption) : "Video",
        summary: (v.tags || []).slice(0, 3).join(" · ") || "Short video",
        createdAt: toIsoDate(v.createdAt),
        preview: { videoUrl: v.videoUrl, thumbnailUrl: v.thumbnailUrl || "", likeCount: v.likeCount ?? 0, commentCount: v.commentCount ?? 0 },
    };
}

function toFeedCard(type, data) {
    const feedType = type === "job" ? "JOB" : type === "marketplace" ? "MARKET" : type === "missing_person" ? "MISSING" : type === "report" ? "ALERT" : "VIDEO_CARD";
    return { type: feedType, data: { ...data }, createdAt: data.createdAt, _key: makeKey(feedType, data.id), _score: 0 };
}

/** Compute recency score: newer = higher (0–1). */
function recencyScore(createdAt) {
    const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    if (ageHours <= 1) return 1;
    if (ageHours <= 24) return 0.8;
    if (ageHours <= 72) return 0.5;
    if (ageHours <= 168) return 0.3;
    return 0.1;
}

/** Build user preference signals from activity. */
async function getUserSignals(userId) {
    if (!userId) return { followingIds: new Set(), viewedCategories: new Set(), viewedTargetTypes: new Set() };
    const [following, activities] = await Promise.all([
        followDb.getFollowingIds(userId, { limit: 500 }),
        Activity.find({ userId: String(userId) }).sort({ createdAt: -1 }).limit(500).lean(),
    ]);
    const viewedCategories = new Set();
    const viewedTargetTypes = new Set();
    for (const a of activities) {
        viewedTargetTypes.add(a.targetType || "");
        if (a.metadata?.category) viewedCategories.add(String(a.metadata.category));
        if (a.targetType === "job") viewedCategories.add("job");
        if (a.targetType === "marketplace") viewedCategories.add("marketplace");
        if (a.targetType === "video") viewedCategories.add("video");
    }
    return {
        followingIds: new Set(following),
        viewedCategories,
        viewedTargetTypes,
    };
}

async function getPersonalizedFeed({ userId, tab = "feeds", cursor, limit = 20 } = {}) {
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const perSource = Math.min(l * 4, 60);

    const excluded = await contentVisibility.getExcludedUserIds();
    const signals = await getUserSignals(userId);

    const types = tab === "feeds"
        ? ["job", "marketplace", "missing_person", "video"]
        : ["report"];

    const [jobsRaw, marketRaw, reportsRaw, missingRaw, videosRaw] = await Promise.all([
        types.includes("job") ? jobsDb.listRecentJobsForFeed({ limit: perSource }) : [],
        types.includes("marketplace") ? marketDb.listRecentMarketplaceForFeed({ limit: perSource }) : [],
        types.includes("report") ? reportService.listBlacklistSummariesForFeed({ limit: perSource }) : [],
        types.includes("missing_person")
            ? MissingPerson.find({ status: "active" })
                .sort({ createdAt: -1 })
                .limit(perSource * 2)
                .lean()
                .then((docs) => docs.filter((d) => !excluded.has(String(d.createdBy || ""))).slice(0, perSource))
            : [],
        types.includes("video")
            ? Video.find({ status: { $in: ["ACTIVE", "approved"] } })
                .sort({ createdAt: -1 })
                .limit(perSource * 2)
                .lean()
                .then((docs) => docs.filter((d) => !excluded.has(String(d.uploaderId || d.createdBy || ""))).slice(0, perSource))
            : [],
    ]);

    const cards = [];
    const jobRows = jobsRaw.filter((r) => !excluded.has(String(r.created_by || "")));
    jobRows.forEach((row) => {
        const d = normalizeJob(row);
        cards.push(toFeedCard("JOB", d));
    });
    marketRaw.forEach((row) => {
        const d = normalizeMarket(row);
        if (!excluded.has(d.authorId)) cards.push(toFeedCard("MARKET", d));
    });
    reportsRaw.forEach((s) => {
        cards.push(toFeedCard("ALERT", normalizeReport(s)));
    });
    missingRaw.forEach((doc) => {
        cards.push(toFeedCard("MISSING", normalizeMissing(doc)));
    });
    videosRaw.forEach((v) => {
        cards.push(toFeedCard("VIDEO_CARD", normalizeVideo(v)));
    });

    // Score each card
    const now = Date.now();
    for (const card of cards) {
        const d = card.data;
        let score = recencyScore(d.createdAt) * RECENCY_WEIGHT;
        if (d.authorId && signals.followingIds.has(d.authorId)) {
            score += FOLLOW_CREATOR_WEIGHT;
        }
        const cat = (d.category || d.preview?.category || "").toLowerCase();
        if (cat && signals.viewedCategories.has(cat)) score += CATEGORY_MATCH_WEIGHT;
        if (d.type && signals.viewedTargetTypes.has(d.type)) score += 0.2;
        card._score = score;
    }

    // Sort by score desc, then recency
    cards.sort((a, b) => {
        if (Math.abs(b._score - a._score) > 0.01) return b._score - a._score;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Inject exploration: 20–30% from lower-scored items
    const personalizedCount = Math.ceil(cards.length * (1 - EXPLORATION_RATIO));
    const exploration = cards.slice(personalizedCount);
    const personalized = cards.slice(0, personalizedCount);
    const merged = [];
    let pi = 0,
        ei = 0;
    while (merged.length < cards.length) {
        if (pi < personalized.length) merged.push(personalized[pi++]);
        if (ei < exploration.length) merged.push(exploration[ei++]);
    }

    // Decode cursor and filter
    let cursorObj = null;
    if (cursor) {
        try {
            cursorObj = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
        } catch (_) {}
    }
    let filtered = merged;
    if (cursorObj?.t) {
        const ct = new Date(cursorObj.t).getTime();
        filtered = merged.filter((c) => new Date(c.createdAt).getTime() < ct);
    }

    const pageItems = filtered.slice(0, l);
    const last = pageItems[pageItems.length - 1];
    const nextCursor =
        pageItems.length === l && last
            ? Buffer.from(JSON.stringify({ t: last.createdAt, k: last._key }), "utf8").toString("base64")
            : null;

    return {
        items: pageItems.map(({ type, data, createdAt }) => ({ type, data, createdAt })),
        nextCursor,
    };
}

module.exports = {
    getPersonalizedFeed,
};
