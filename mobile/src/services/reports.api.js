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

export async function createReport(body) {
  const { data } = await client.post("/reports", {
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

/** Report a job, marketplace listing, or user. */
export async function createListingReport(body) {
  const { data } = await client.post("/reports/listings", {
    targetType: body.targetType,
    targetId: String(body.targetId),
    reason: body.reason || "",
    description: body.description || "",
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
