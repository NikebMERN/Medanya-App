import axios from "axios";

const getToken = () => {
  try {
    return window.__ADMIN_TOKEN__ || localStorage.getItem("medanya_admin_token") || null;
  } catch {
    return null;
  }
};

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("medanya_admin_token");
      window.__ADMIN_TOKEN__ = null;
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// Admin endpoints (backend uses /api/admin/* with JWT + role admin)
export const adminApi = {
  health: () => api.get("/admin/health"),
  users: (params) => api.get("/admin/users", { params }),
  reportedUsers: (params) => api.get("/admin/reported-users", { params }),
  reportContext: (userId, reporterId) =>
    api.get(`/admin/reported-users/${userId}/context`, { params: reporterId ? { reporterId } : {} }),
  markUserSafe: (userId) => api.post(`/admin/reported-users/${userId}/safe`),
  getUserFullData: (userId) => api.get(`/admin/users/${userId}/full`),
  setUserRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, { role }),
  banUser: (userId, banned) => api.patch(`/admin/users/${userId}/ban`, { banned }),
  unbanUser: (userId) => api.patch(`/admin/users/${userId}/unban`),
  getUserRisk: (userId) => api.get(`/admin/users/${userId}/risk`),
  kycList: (params) => api.get("/admin/kyc", { params }),
  kycUsers: (params) => api.get("/admin/kyc/users", { params }),
  kycRequestOtp: (userId) => api.post("/admin/kyc/request-otp", { userId }),
  kycVerifyOtp: (userId, otp) => api.post("/admin/kyc/verify-otp", { userId, otp }),
  kycUserData: (userId) => api.get(`/admin/kyc/user/${userId}/data`),
  kycApprove: (submissionId, body) => api.patch(`/admin/kyc/${submissionId}/approve`, body),
  kycReject: (submissionId, body) => api.patch(`/admin/kyc/${submissionId}/reject`, body),
  reviewsListings: () => api.get("/admin/reviews/listings"),
  updateListingStatus: (type, id, body) => api.patch(`/admin/reviews/listings/${type}/${id}`, body),
  moderationCounts: () => api.get("/admin/moderation/counts"),
  moderationQueue: (params) => api.get("/admin/moderation/queue", { params }),
  moderationItem: (targetType, targetId) =>
    api.get("/admin/moderation/item", { params: { targetType, targetId } }),
  moderationAction: (body) => api.patch("/admin/moderation/action", body),
};

// Analytics (JWT + admin role required)
export const analyticsApi = {
  overview: (range = 28) => api.get("/analytics/admin/overview", { params: { range } }),
  userActivity: (userId, range = 28) =>
    api.get(`/analytics/admin/users/${userId}/activity`, { params: { range } }),
};
