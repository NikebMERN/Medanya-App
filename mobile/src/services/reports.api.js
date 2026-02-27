/**
 * REST API for reports & blacklist module.
 * Base: /api (reports, blacklist)
 */
import client from "../api/client";

export const REPORT_REASONS = [
  { value: "unpaid_salary", label: "Unpaid salary" },
  { value: "fraud_scam", label: "Fraud / Scam" },
  { value: "physical_abuse", label: "Physical abuse" },
  { value: "sexual_harassment", label: "Sexual harassment" },
  { value: "passport_confiscation", label: "Passport confiscation" },
  { value: "other", label: "Other" },
];

/** Report scammer (blacklist) — phone/employer based. */
export async function createReport(body) {
  const { data } = await client.post("/reports/blacklist", {
    phoneNumber: body.phoneNumber,
    employerName: body.employerName || undefined,
    reason: body.reason,
    description: body.description || undefined,
    locationText: body.locationText || undefined,
    evidence: body.evidence
      ? {
          photos: Array.isArray(body.evidence.photos) ? body.evidence.photos : [],
          videos: Array.isArray(body.evidence.videos) ? body.evidence.videos : [],
        }
      : undefined,
  });
  return data?.report ?? data;
}

export async function listMyReports(params = {}) {
  const res = await client.get("/reports/mine", {
    params: { page: params.page, limit: params.limit },
  });
  const d = res?.data ?? res;
  return {
    reports: Array.isArray(d?.reports) ? d.reports : [],
    page: d?.page ?? 1,
    limit: d?.limit ?? 20,
    total: d?.total ?? 0,
  };
}

export async function searchBlacklist(params = {}) {
  const res = await client.get("/blacklist/search", {
    params: {
      phone: params.phone || params.q,
      name: params.name,
      location: params.location,
      page: params.page,
      limit: params.limit,
    },
  });
  const d = res?.data ?? res;
  return {
    results: Array.isArray(d?.results) ? d.results : [],
    page: d?.page ?? 1,
    limit: d?.limit ?? 20,
  };
}

/** Unified report target types. */
export const REPORT_TARGET_TYPES = ["JOB", "MARKET_ITEM", "MISSING_PERSON", "VIDEO", "LIVESTREAM", "USER"];

/** Unified report reasons. */
export const UNIFIED_REPORT_REASONS = [
  "SCAM_FRAUD", "HARASSMENT", "HATE", "NUDITY_SEXUAL", "GORE_VIOLENCE", "CHILD_SAFETY", "SPAM", "OTHER",
];

/** Content report reasons for JOB / MARKET_ITEM (Scam, Deposit request, Passport request, Harassment, Fake item, Other). */
export const CONTENT_REPORT_REASONS = [
  { value: "SCAM_FRAUD", label: "Scam" },
  { value: "DEPOSIT_REQUEST", label: "Deposit request" },
  { value: "PASSPORT_REQUEST", label: "Passport request" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "FAKE_ITEM", label: "Fake item" },
  { value: "OTHER", label: "Other" },
];

/** Create a unified content report (POST /reports). */
export async function createUnifiedReport(body) {
  const { data } = await client.post("/reports", {
    targetType: body.targetType,
    targetId: String(body.targetId),
    reason: body.reason || "OTHER",
    description: body.description || "",
    mediaUrls: Array.isArray(body.mediaUrls) ? body.mediaUrls : [],
  });
  return data;
}

/** User report reasons (for targetType: "user"). */
export const USER_REPORT_REASONS = [
  { value: "unpaid_salary", label: "Unpaid salary" },
  { value: "fraud_scam", label: "Fraud / Scam" },
  { value: "physical_abuse", label: "Physical abuse" },
  { value: "sexual_harassment", label: "Sexual harassment" },
  { value: "passport_confiscation", label: "Passport confiscation" },
  { value: "video_content", label: "Inappropriate video content" },
  { value: "livestream_content", label: "Inappropriate livestream" },
  { value: "other", label: "Other" },
];

/** Map user-facing reason to unified report reason (POST /reports). */
function userReasonToUnified(reason, customReason) {
  const r = (reason || "other").toLowerCase();
  const map = {
    fraud_scam: "SCAM_FRAUD",
    physical_abuse: "HARASSMENT",
    sexual_harassment: "HARASSMENT",
    video_content: "OTHER",
    livestream_content: "OTHER",
    unpaid_salary: "SCAM_FRAUD",
    passport_confiscation: "OTHER",
    other: "OTHER",
  };
  return map[r] || "OTHER";
}

/** Report a user via unified API (shows in admin moderation queue). */
export async function reportUser(body) {
  const { targetUserId, reason, customReason, description, contextSourceUrl } = body;
  const unifiedReason = userReasonToUnified(reason, customReason);
  const desc = [customReason, description].filter(Boolean).join(" ").trim().slice(0, 1000) || "";
  const { data } = await client.post("/reports", {
    targetType: "USER",
    targetId: String(targetUserId),
    reason: unifiedReason,
    description: desc,
    mediaUrls: [],
  });
  return data;
}

/** Report a job, marketplace listing, or user (legacy listings API). */
export async function createListingReport(body) {
  const { data } = await client.post("/reports/listings", {
    targetType: body.targetType,
    targetId: String(body.targetId),
    reason: body.reason || "",
    customReason: body.customReason || "",
    description: body.description || "",
    contextSourceUrl: body.contextSourceUrl || "",
    mediaUrls: Array.isArray(body.mediaUrls) ? body.mediaUrls : [],
  });
  return data?.report ?? data;
}

export async function getBlacklistSummary(phoneNumber, params = {}) {
  const { data } = await client.get(`/blacklist/${encodeURIComponent(phoneNumber)}`, {
    params: { limit: params.limit },
  });
  return {
    summary: data?.summary ?? null,
    recentReports: Array.isArray(data?.recentReports) ? data.recentReports : [],
  };
}
