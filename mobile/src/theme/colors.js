/**
 * Theme-aware colors. Use getColors(theme) with 'light' | 'dark'.
 */
export const lightColors = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceLight: "#f1f5f9",
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  error: "#dc2626",
  success: "#16a34a",
  warning: "#ca8a04",
  white: "#ffffff",
  black: "#0f172a",
  /** Unread / notification indicator (chat list blue dot, tab badge, future push). */
  unreadIndicatorBlue: "#3b82f6",
};

export const darkColors = {
  background: "#0f172a",
  surface: "#1e293b",
  surfaceLight: "#334155",
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  text: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  border: "#334155",
  error: "#ef4444",
  success: "#22c55e",
  warning: "#eab308",
  white: "#ffffff",
  black: "#0f172a",
  unreadIndicatorBlue: "#3b82f6",
};

export function getColors(theme) {
  return theme === "light" ? lightColors : darkColors;
}

/** @deprecated Use getColors(useThemeStore.getState().theme) or useThemeColors() */
export const colors = darkColors;
