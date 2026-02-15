import { useAuth } from "../contexts/AuthContext";

const ADMIN_ONLY = ["ADMIN"];
const MODERATOR_UP = ["ADMIN", "MODERATOR"];

export function RbacGuard({ children, roles = ADMIN_ONLY, fallback = null }) {
  const { user } = useAuth();
  const role = (user?.role || "").toUpperCase();
  const allowed = roles.map((r) => r.toUpperCase()).includes(role);
  if (!allowed) return fallback;
  return children;
}

export function useCan(permission) {
  const { user } = useAuth();
  const role = (user?.role || "").toUpperCase();
  if (role === "ADMIN") return true;
  if (permission === "moderate" && MODERATOR_UP.includes(role)) return true;
  return false;
}
