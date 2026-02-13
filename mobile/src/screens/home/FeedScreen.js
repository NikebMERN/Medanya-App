import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export default function FeedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feed</Text>
      <Text style={styles.subtitle}>Phase 5 – Community feed will load here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: spacing.sm,
    fontStyle: typography.fontStyle,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: typography.fontStyle,
  },
});
