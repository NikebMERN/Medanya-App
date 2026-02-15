import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem("medanya_admin_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem("medanya_admin_token") || null;
    } catch {
      return null;
    }
  });

  const login = useCallback((newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    sessionStorage.setItem("medanya_admin_token", newToken);
    sessionStorage.setItem("medanya_admin_user", JSON.stringify(newUser || {}));
    window.__ADMIN_TOKEN__ = newToken;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem("medanya_admin_token");
    sessionStorage.removeItem("medanya_admin_user");
    window.__ADMIN_TOKEN__ = null;
  }, []);

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
