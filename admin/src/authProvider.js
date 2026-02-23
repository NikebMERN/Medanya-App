const TOKEN_KEY = "medanya_admin_token";
const USER_KEY = "medanya_admin_user";

export const authProvider = {
  login: ({ token, user }) => {
    if (token && user) {
      try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        window.__ADMIN_TOKEN__ = token;
      } catch (e) {
        return Promise.reject(new Error("Storage unavailable"));
      }
      return Promise.resolve();
    }
    return Promise.reject(new Error("Invalid credentials"));
  },

  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.__ADMIN_TOKEN__ = null;
    } catch (_) {}
    return Promise.resolve();
  },

  checkAuth: () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY) || window.__ADMIN_TOKEN__;
      return token ? Promise.resolve() : Promise.reject({ redirectTo: "/login" });
    } catch {
      return Promise.reject({ redirectTo: "/login" });
    }
  },

  checkError: (error) => {
    const status = error?.response?.status ?? error?.status;
    if (status === 401 || status === 403) {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } catch (_) {}
      return Promise.reject({ message: "Unauthorized", redirectTo: "/login" });
    }
    return Promise.resolve();
  },

  getIdentity: () => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return Promise.reject();
      const user = JSON.parse(raw);
      return Promise.resolve({
        id: user.id ?? user.userId,
        fullName: user.display_name || user.phone || "Admin",
        avatar: user.avatar_url,
      });
    } catch {
      return Promise.reject();
    }
  },

  getPermissions: () => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return Promise.resolve(null);
      const user = JSON.parse(raw);
      const role = user.role || "admin";
      return Promise.resolve(role);
    } catch {
      return Promise.resolve(null);
    }
  },
};
