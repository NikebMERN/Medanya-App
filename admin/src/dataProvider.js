import { fetchUtils } from "react-admin";

const API_URL = "/api";
const getToken = () =>
  window.__ADMIN_TOKEN__ || localStorage.getItem("medanya_admin_token") || "";

const httpClient = (url, options = {}) => {
  const token = getToken();
  const headers = new Headers({
    "Content-Type": "application/json",
    ...options.headers,
  });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetchUtils.fetchJson(url, { ...options, headers });
};

function toRA({ data, total }) {
  return { data, total: total ?? data?.length ?? 0 };
}

export const dataProvider = {
  getList: async (resource, params) => {
    const { page, perPage, sort, filter } = params;
    const pageNum = page || 1;
    const limit = perPage || 25;
    const order = sort?.field ? `${sort.field}:${sort.order}` : undefined;

    if (resource === "moderationQueue") {
      const q = new URLSearchParams({
        status: filter?.status ?? "PENDING",
        targetType: filter?.targetType ?? "",
        priority: filter?.priority ?? "",
        limit: String(limit),
      });
      const res = await httpClient(`${API_URL}/admin/moderation/queue?${q}`);
      const { items = [], total = 0 } = res.json;
      const data = items.map((i) => ({
        id: `${i.targetType}_${i.targetId}`,
        ...i,
      }));
      return toRA({ data, total });
    }

    if (resource === "reports") {
      const q = new URLSearchParams({
        page: String(pageNum),
        limit: String(limit),
        ...(filter?.targetType && { targetType: filter.targetType }),
        ...(filter?.reason && { reason: filter.reason }),
        ...(filter?.status && { status: filter.status }),
      });
      const res = await httpClient(`${API_URL}/admin/reports?${q}`);
      const out = res.json;
      const data = (out.reports ?? out.data ?? []).map((r) => ({
        id: r._id ?? r.id,
        ...r,
      }));
      return toRA({ data, total: out.total ?? data.length });
    }

    if (resource === "users") {
      const q = new URLSearchParams({
        page: String(pageNum),
        limit: String(limit),
        query: String(filter?.q ?? filter?.query ?? ""),
      });
      const res = await httpClient(`${API_URL}/admin/users?${q}`);
      const out = res.json;
      const data = (out.users ?? out.data ?? []).map((u) => ({
        id: String(u.id ?? u.userId),
        ...u,
      }));
      return toRA({ data, total: out.total ?? data.length });
    }

    if (resource === "kycSubmissions") {
      const q = new URLSearchParams({
        page: String(pageNum),
        limit: String(limit),
        status: filter?.status ?? "pending_manual",
        ...(filter?.docType && { docType: filter.docType }),
      });
      const res = await httpClient(`${API_URL}/admin/kyc?${q}`);
      const out = res.json;
      const list = out.submissions ?? out.data ?? [];
      const data = list.map((s) => ({
        id: String(s.id ?? s._id),
        ...s,
      }));
      return toRA({ data, total: out.total ?? data.length });
    }

    if (resource === "bans") {
      const q = new URLSearchParams({ page: String(pageNum), limit: String(limit) });
      const res = await httpClient(`${API_URL}/admin/bans?${q}`);
      const out = res.json;
      const data = (out.bans ?? out.data ?? []).map((b) => ({
        id: String(b.id),
        ...b,
      }));
      return toRA({ data, total: out.total ?? data.length });
    }

    if (resource === "auditLog") {
      const q = new URLSearchParams({
        page: String(pageNum),
        limit: String(limit),
        ...(filter?.adminId && { adminId: filter.adminId }),
        ...(filter?.actionType && { actionType: filter.actionType }),
        ...(filter?.targetType && { targetType: filter.targetType }),
      });
      const res = await httpClient(`${API_URL}/admin/audit?${q}`);
      const out = res.json;
      const data = (out.logs ?? out.data ?? []).map((a) => ({
        id: String(a.id),
        ...a,
      }));
      return toRA({ data, total: out.total ?? data.length });
    }

    return Promise.reject(new Error(`Unknown resource: ${resource}`));
  },

  getOne: async (resource, params) => {
    const { id } = params;

    if (resource === "moderationQueue") {
      const [targetType, targetId] = String(id).split("_");
      const q = new URLSearchParams({ targetType, targetId });
      const res = await httpClient(`${API_URL}/admin/moderation/item?${q}`);
      const out = res.json;
      const item = {
        id,
        targetType,
        targetId,
        queueItem: out.queueItem,
        reports: out.reports ?? [],
        content: out.content,
      };
      return { data: item };
    }

    if (resource === "users") {
      const res = await httpClient(`${API_URL}/admin/users/${id}/full`);
      const out = res.json;
      const user = out.mysql?.user || {};
      const data = { id: String(id), ...user };
      return { data };
    }

    if (resource === "kycSubmissions") {
      const res = await httpClient(`${API_URL}/admin/kyc/submission/${id}`);
      const out = res.json;
      return { data: { id: String(id), ...out } };
    }

    return Promise.reject(new Error(`Unknown resource: ${resource}`));
  },

  update: async (resource, params) => {
    const { id, data } = params;

    if (resource === "moderationQueue" && data?.actionType) {
      const [targetType, targetId] = String(id).split("_");
      const res = await httpClient(`${API_URL}/admin/moderation/action`, {
        method: "PATCH",
        body: JSON.stringify({
          actionType: data.actionType,
          targetType,
          targetId,
          reason: data.reason,
          banLevel: data.banLevel,
        }),
      });
      return { data: res.json };
    }

    if (resource === "reports") {
      const action = data?.resolve ? "resolve" : "dismiss";
      const res = await httpClient(`${API_URL}/admin/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, reason: data?.reason }),
      });
      return { data: { id, ...res.json } };
    }

    if (resource === "users") {
      if (data?.unban === true) {
        const res = await httpClient(`${API_URL}/admin/users/${id}/unban`, {
          method: "PATCH",
        });
        return { data: { id, ...res.json } };
      }
      if (data?.banLevel) {
        const res = await httpClient(`${API_URL}/admin/users/${id}/ban`, {
          method: "PATCH",
          body: JSON.stringify({ banLevel: data.banLevel, reason: data.reason }),
        });
        return { data: { id, ...res.json } };
      }
    }

    if (resource === "kycSubmissions") {
      if (data?.approve === true) {
        const res = await httpClient(
          `${API_URL}/admin/kyc/${id}/approve`,
          {
            method: "PATCH",
            body: JSON.stringify({ faceVerified: data.faceVerified }),
          }
        );
        return { data: { id, ...res.json } };
      }
      if (data?.reject === true) {
        const res = await httpClient(
          `${API_URL}/admin/kyc/${id}/reject`,
          {
            method: "PATCH",
            body: JSON.stringify({ reason: data.reason }),
          }
        );
        return { data: { id, ...res.json } };
      }
    }

    return Promise.reject(new Error(`Unknown resource: ${resource}`));
  },

  create: async (resource, params) => {
    if (resource === "bans") {
      const res = await httpClient(`${API_URL}/admin/bans`, {
        method: "POST",
        body: JSON.stringify(params.data),
      });
      const created = res.json;
      return { data: { id: created.id, ...created } };
    }
    return Promise.reject(new Error(`Unknown resource: ${resource}`));
  },

  delete: async (resource, params) => {
    if (resource === "bans") {
      await httpClient(`${API_URL}/admin/bans/${params.id}`, { method: "DELETE" });
      return { data: params.previousData };
    }
    return Promise.reject(new Error(`Unknown resource: ${resource}`));
  },
};
