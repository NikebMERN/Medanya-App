/**
 * Central typography for the app. Use for consistent font across screens.
 * Set fontFamily to a loaded font name (e.g. from expo-font) or leave undefined for system default.
 */
export const typography = {
  fontFamily: undefined,
  fontFamilyBold: undefined,
};

export function getFontFamily(weight = "normal") {
  if (weight === "bold" && typography.fontFamilyBold) return typography.fontFamilyBold;
  return typography.fontFamily;
}
