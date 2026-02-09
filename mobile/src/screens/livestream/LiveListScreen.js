import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

export default function LiveListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live</Text>
      <Text style={styles.subtitle}>Phase 7 – Live streams will load here</Text>
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
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: spacing.sm },
  subtitle: { color: colors.textSecondary, fontSize: 14 },
});
