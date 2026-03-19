/**
 * SellerTrustBadge — Optional badge for verified/trusted sellers.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";

export default function SellerTrustBadge({ isVerified, label = "Verified" }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  if (!isVerified) return null;
  return (
    <View style={[styles.badge, { backgroundColor: colors.primary + "25" }]}>
      <MaterialIcons name="verified" size={12} color={colors.primary} />
      <Text style={[styles.text, { color: colors.primary }]}>{label}</Text>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    badge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      gap: 4,
    },
    text: { fontSize: 10, fontWeight: "700" },
  });
}
