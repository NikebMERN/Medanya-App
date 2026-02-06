// src/modules/feed/feed.service.js
const jobsDb = require("../jobs/job.mysql");
const marketDb = require("../marketplace/market.mysql");
const reportService = require("../reports/report.service");
const MissingPerson = require("../missingPersons/missing.model");

function encodeCursor(obj) {
    return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}

function decodeCursor(cursor) {
    if (!cursor) return null;
    try {
        return JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
    } catch {
        return null;
    }
}

function toIsoDate(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
}

function makeKey(type, id) {
    return `${type}:${id}`;
}

function compareDesc(a, b) {
    // createdAt desc, then key desc
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (tb !== ta) return tb - ta;
    return b._key.localeCompare(a._key);
}

function filterByCursor(items, cursorObj) {
    if (!cursorObj?.t || !cursorObj?.k) return items;

    const ct = new Date(cursorObj.t).getTime();
    const ck = String(cursorObj.k);

    return items.filter((it) => {
        const t = new Date(it.createdAt).getTime();
        if (t < ct) return true;
        if (t > ct) return false;
        // same timestamp: only items with key < cursor key (because we sort key desc)
        return it._key.localeCompare(ck) < 0;
    });
}

function normalizeJob(row) {
    return {
        type: "job",
        id: row.id,
        title: row.title,
        summary: `${row.category}${row.salary ? ` • ${row.salary}` : ""}`,
        location: row.location || "",
        createdAt: toIsoDate(row.created_at),
        preview: {
            category: row.category,
            salary: row.salary || "",
            imageUrl: row.image_url || "",
        },
    };
}

function normalizeMarket(row) {
    return {
        type: "marketplace",
        id: row.id,
        title: row.title,
        summary: `${row.category} • ${row.price}`,
        location: row.location || "",
        createdAt: toIsoDate(row.created_at),
        preview: {
            price: row.price,
            category: row.category,
            imageUrl:
                Array.isArray(row.image_urls) && row.image_urls[0]
                    ? row.image_urls[0]
                    : "",
        },
    };
}

function normalizeMissing(doc) {
    return {
        type: "missing_person",
        id: doc._id.toString(),
        title: doc.fullName ? `Missing: ${doc.fullName}` : "Missing Person Alert",
        summary: doc.description
            ? doc.description.length > 90
                ? doc.description.slice(0, 90) + "…"
                : doc.description
            : "",
        location: doc.lastKnownLocationText || "",
        createdAt: toIsoDate(doc.createdAt),
        preview: {
            photoUrl: doc.photoUrl,
            voiceUrl: doc.voiceUrl || "",
            status: doc.status,
        },
    };
}

function normalizeReportSummary(s) {
    return {
        type: "report",
        id: s.phoneNumberMasked, // masked identifier for feed
        title: `Reported: ${s.employerName || s.phoneNumberMasked}`,
        summary: `${s.riskLevel.toUpperCase()} • ${s.totalReports} reports`,
        location: s.locationText || "",
        createdAt: toIsoDate(s.latestAt),
        preview: {
            riskLevel: s.riskLevel,
            totalReports: s.totalReports,
            phoneMasked: s.phoneNumberMasked,
        },
    };
}

async function getFeed({ cursor, limit = 20, types } = {}) {
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const cursorObj = decodeCursor(cursor);

    const typeSet = new Set(
        (types
            ? String(types).split(",")
            : ["job", "report", "missing_person", "marketplace"]
        )
            .map((x) => x.trim())
            .filter(Boolean),
    );

    // Fetch a bit more per source, then merge
    const perSource = Math.min(Math.max(l * 2, 20), 60);

    const [jobs, market, reportSummaries, missing] = await Promise.all([
        typeSet.has("job")
            ? jobsDb.listRecentJobsForFeed({ limit: perSource })
            : Promise.resolve([]),
        typeSet.has("marketplace")
            ? marketDb.listRecentMarketplaceForFeed({ limit: perSource })
            : Promise.resolve([]),
        typeSet.has("report")
            ? reportService.listBlacklistSummariesForFeed({ limit: perSource })
            : Promise.resolve([]),
        typeSet.has("missing_person")
            ? MissingPerson.find({ status: "active" })
                .sort({ createdAt: -1 })
                .limit(perSource)
                .lean()
            : Promise.resolve([]),
    ]);

    let merged = [
        ...jobs.map(normalizeJob),
        ...market.map(normalizeMarket),
        ...reportSummaries.map(normalizeReportSummary),
        ...missing.map(normalizeMissing),
    ].filter((x) => x.createdAt);

    // Add stable key for cursor ordering
    merged = merged.map((x) => ({ ...x, _key: makeKey(x.type, x.id) }));

    merged.sort(compareDesc);

    // Apply cursor filter AFTER merge for correctness across sources
    merged = filterByCursor(merged, cursorObj);

    const pageItems = merged.slice(0, l);
    const last = pageItems[pageItems.length - 1];

    const nextCursor =
        pageItems.length === l && last
            ? encodeCursor({ t: last.createdAt, k: last._key })
            : null;

    // remove internal key
    return {
        items: pageItems.map(({ _key, ...rest }) => rest),
        nextCursor,
    };
}

async function getHighlights({ limit = 20 } = {}) {
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

    const [dangerousReports, missing] = await Promise.all([
        reportService.listBlacklistSummariesForFeed({ limit: l * 2 }),
        MissingPerson.find({ status: "active" })
            .sort({ createdAt: -1 })
            .limit(l)
            .lean(),
    ]);

    const dangerOnly = dangerousReports
        .filter((r) => r.riskLevel === "dangerous")
        .slice(0, l);

    let merged = [
        ...dangerOnly.map(normalizeReportSummary),
        ...missing.map(normalizeMissing),
    ].filter((x) => x.createdAt);

    merged = merged.map((x) => ({ ...x, _key: makeKey(x.type, x.id) }));
    merged.sort(compareDesc);

    return { items: merged.slice(0, l).map(({ _key, ...r }) => r) };
}

module.exports = {
    getFeed,
    getHighlights,
};
