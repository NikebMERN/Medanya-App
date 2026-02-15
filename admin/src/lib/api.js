import axios from "axios";

const getToken = () => {
  try {
    return window.__ADMIN_TOKEN__ || sessionStorage.getItem("medanya_admin_token") || null;
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
      sessionStorage.removeItem("medanya_admin_token");
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
  setUserRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, { role }),
  banUser: (userId, banned) => api.patch(`/admin/users/${userId}/ban`, { banned }),
  getUserRisk: (userId) => api.get(`/admin/users/${userId}/risk`),
  kycList: (params) => api.get("/admin/kyc", { params }),
  kycApprove: (submissionId, body) => api.patch(`/admin/kyc/${submissionId}/approve`, body),
  kycReject: (submissionId, body) => api.patch(`/admin/kyc/${submissionId}/reject`, body),
  reviewsListings: () => api.get("/admin/reviews/listings"),
  updateListingStatus: (type, id, body) => api.patch(`/admin/reviews/listings/${type}/${id}`, body),
};
