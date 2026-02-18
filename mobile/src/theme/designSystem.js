/**
 * Medanya design system — matches UI screenshots (dark theme, neumorphic cards, blue accent).
 * Use with useThemeColors() for theme-aware colors; this file adds radii, shadows, typography.
 */
export const radii = {
  card: 26,
  pill: 20,
  button: 20,
  input: 18,
  avatar: 9999,
  fab: 9999,
};

export const shadows = {
  neo: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  neoSoft: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  glow: {
    shadowColor: "#2E6BFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const typography = {
  appTitle: { fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  sectionTitle: { fontSize: 20, fontWeight: "800", letterSpacing: 0.5 },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  cardSubtitle: { fontSize: 13, fontWeight: "500" },
  label: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  body: { fontSize: 15, fontWeight: "500" },
  caption: { fontSize: 12, fontWeight: "500" },
};

/** Screen padding, card padding, list spacing, section gap */
export const layout = {
  screenPadding: 16,
  cardPadding: 16,
  listItemGap: 12,
  sectionGap: 18,
};
