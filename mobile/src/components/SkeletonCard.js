/**
 * Loading skeleton for list cards (marketplace/jobs)
 */
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";

export default function SkeletonCard({ variant = "marketplace" }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const s = (c) => [styles.skeleton, { backgroundColor: c, opacity }];

  if (variant === "job") {
    return (
      <View style={styles.card}>
        <Animated.View style={[styles.jobImage, s(colors.surfaceLight)]} />
        <View style={styles.jobBody}>
          <Animated.View style={[styles.line, styles.lineTitle, s(colors.surfaceLight)]} />
          <Animated.View style={[styles.line, styles.lineShort, s(colors.surfaceLight)]} />
          <Animated.View style={[styles.line, styles.lineShort, s(colors.surfaceLight)]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.marketCard}>
      <Animated.View style={[styles.marketImage, s(colors.surfaceLight)]} />
      <View style={styles.marketBody}>
        <Animated.View style={[styles.line, styles.lineTitle, s(colors.surfaceLight)]} />
        <Animated.View style={[styles.line, styles.lineShort, s(colors.surfaceLight)]} />
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    skeleton: { borderRadius: 6 },
    line: { height: 12, borderRadius: 6 },
    lineTitle: { width: "80%", marginBottom: spacing.xs },
    lineShort: { width: "50%" },
    marketCard: {
      flex: 1,
      maxWidth: "48%",
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    marketImage: {
      width: "100%",
      aspectRatio: 1,
    },
    marketBody: { padding: spacing.sm },
    card: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: spacing.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    jobImage: { width: 90, height: 90 },
    jobBody: { flex: 1, padding: spacing.md, justifyContent: "center" },
  });
}
