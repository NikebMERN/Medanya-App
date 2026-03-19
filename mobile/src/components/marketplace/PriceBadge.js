/**
 * PriceBadge — Compact price chip for marketplace cards (mpsd: dark purple).
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";

const MARKETPLACE_PURPLE = "#4a3f91";

export default function PriceBadge({ price, currency = "AED", variant = "marketplace" }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const display =
    price != null && price !== ""
      ? String(price).includes(currency)
        ? String(price)
        : `${currency} ${price}`
      : "";
  if (!display) return null;
  const bgColor = variant === "marketplace" ? MARKETPLACE_PURPLE : colors.primary;
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={styles.text}>{display}</Text>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      alignSelf: "flex-start",
    },
    text: { fontSize: 12, fontWeight: "700", color: "#fff" },
  });
}
