// src/modules/admin/reviews.service.js
const jobDb = require("../jobs/job.mysql");
const marketDb = require("../marketplace/market.mysql");

async function listFlaggedListings({ status, type, page = 1, limit = 20 }) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const statuses =
        status === "PENDING_REVIEW"
            ? ["PENDING_REVIEW"]
            : status === "HIDDEN_PENDING_REVIEW"
                ? ["HIDDEN_PENDING_REVIEW"]
                : ["PENDING_REVIEW", "HIDDEN_PENDING_REVIEW"];

    let jobList = [];
    if (!type || type === "job") {
        for (const st of statuses) {
            const r = await jobDb.listJobs({ status: st, page: 1, limit: 500 });
            jobList = jobList.concat(r.jobs || []);
        }
    }

    let itemList = [];
    if (!type || type === "marketplace") {
        for (const st of statuses) {
            const r = await marketDb.listItems({ status: st, page: 1, limit: 500 });
            itemList = itemList.concat(r.items || []);
        }
    }

    const jobsMapped = jobList.map((j) => ({
        type: "job",
        id: j.id,
        title: j.title,
        status: j.status,
        risk_score: j.risk_score,
        reports_count: j.reports_count,
        matched_keywords: j.matched_keywords,
        created_by: j.created_by,
        created_at: j.created_at,
    }));
    const itemsMapped = itemList.map((i) => ({
        type: "marketplace",
        id: i.id,
        title: i.title,
        status: i.status,
        risk_score: i.risk_score,
        reports_count: i.reports_count,
        matched_keywords: i.matched_keywords,
        seller_id: i.seller_id,
        created_at: i.created_at,
    }));

    const all = [...jobsMapped, ...itemsMapped];
    const total = all.length;
    const offset = (p - 1) * l;
    const paginated = all.slice(offset, offset + l);

    return { page: p, limit: l, total, listings: paginated };
}

async function updateListingStatus(type, id, action) {
    const t = String(type || "").toLowerCase();
    const actions = new Set(["approve", "reject", "hide", "ban"]);
    if (!actions.has(action))
        throw Object.assign(new Error("Invalid action"), { code: "VALIDATION_ERROR" });

    const newStatus =
        action === "approve"
            ? "active"
            : action === "reject"
                ? "rejected"
                : action === "hide"
                    ? "HIDDEN_PENDING_REVIEW"
                    : "banned";

    if (t === "job") {
        const r = await jobDb.updateJob(String(id), { status: newStatus });
        if (!r) throw Object.assign(new Error("Job not found"), { code: "NOT_FOUND" });
        return { type: "job", id, status: newStatus };
    }
    if (t === "marketplace") {
        const r = await marketDb.updateItem(String(id), { status: newStatus });
        if (!r) throw Object.assign(new Error("Listing not found"), { code: "NOT_FOUND" });
        return { type: "marketplace", id, status: newStatus };
    }
    throw Object.assign(new Error("Invalid type"), { code: "VALIDATION_ERROR" });
}

module.exports = { listFlaggedListings, updateListingStatus };
