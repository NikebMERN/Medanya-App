/**
 * Theme-aware colors. Use getColors(theme) with 'light' | 'dark'.
 */
export const lightColors = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceLight: "#f1f5f9",
  inputBg: "#f1f5f9",
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

/** Dark theme matching screenshots: deep navy, neumorphic cards, blue accent */
export const darkColors = {
  background: "#070B14",
  backgroundGradientEnd: "#0B1222",
  surface: "#0F1A2B",
  surfaceLight: "#151F33",
  inputBg: "#101B2C",
  primary: "#2E6BFF",
  primaryDark: "#1d4ed8",
  text: "#FFFFFF",
  textSecondary: "#8AA0C5",
  textMuted: "#6B7B9A",
  border: "#1A2744",
  error: "#ef4444",
  success: "#22c55e",
  warning: "#eab308",
  white: "#FFFFFF",
  black: "#070B14",
  unreadIndicatorBlue: "#2E6BFF",
};

export function getColors(theme) {
  return theme === "light" ? lightColors : darkColors;
}

/** @deprecated Use getColors(useThemeStore.getState().theme) or useThemeColors() */
export const colors = darkColors;
