/**
 * Risk badge: risk_score>=60 show "⚠ Safety Flag", ai_scam_score>=80 show "🚨 High Risk"
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";

export default function RiskBadge({ riskScore, aiScamScore }) {
  const colors = useThemeColors();
  const r = riskScore != null ? Number(riskScore) : 0;
  const a = aiScamScore != null ? Number(aiScamScore) : 0;
  const showHighRisk = a >= 80;
  const showSafetyFlag = r >= 60 && !showHighRisk;

  if (!showHighRisk && !showSafetyFlag) return null;

  return (
    <View style={styles.wrap}>
      {showHighRisk && (
        <View style={[styles.badge, styles.highRisk]}>
          <Text style={styles.emoji}>🚨</Text>
          <Text style={[styles.text, { color: colors.error }]}>High Risk</Text>
        </View>
      )}
      {showSafetyFlag && (
        <View style={[styles.badge, styles.safetyFlag]}>
          <Text style={styles.emoji}>⚠</Text>
          <Text style={[styles.text, { color: colors.warning }]}>Safety Flag</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  highRisk: { backgroundColor: "rgba(239,68,68,0.2)" },
  safetyFlag: { backgroundColor: "rgba(234,179,8,0.2)" },
  emoji: { fontSize: 12 },
  text: { fontSize: 12, fontWeight: "600" },
});
