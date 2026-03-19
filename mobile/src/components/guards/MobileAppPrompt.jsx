import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { radii, layout } from "../../theme/designSystem";
import { spacing } from "../../theme/spacing";
import { useFeatureGate } from "../../hooks/useFeatureGate";
import { openExternalUrl } from "../../utils/platformGuards";
import { trackEvent } from "../../utils/trackEvent";

export default function MobileAppPrompt({
  title,
  message,
  featureName,
  variant = "card", // "card" | "full"
  compact = false,
  showStoreButtons = true,
  playStoreUrl,
  appStoreUrl,
  hidePlayStoreButton = false,
  hideAppStoreButton = false,
  continueLabel,
  onContinue,
  iconName = "smartphone",
  secondaryText = "Already using the app? Open it on your phone.",
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, { variant, compact }), [colors, variant, compact]);
  const gate = useFeatureGate({ featureName, title, message, playStoreUrl, appStoreUrl });

  const onPressStore = async (store) => {
    const url = store === "play" ? gate.playStoreUrl : gate.appStoreUrl;
    trackEvent("feature_gate_click_store", "feature", String(featureName || "unknown"), { store, platform: "web" });
    await openExternalUrl(url);
  };

  return (
    <View style={styles.outer}>
      <View style={styles.card} accessibilityRole="summary">
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <MaterialIcons name={iconName} size={compact ? 26 : 34} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>{gate.title}</Text>
        <Text style={styles.message}>{gate.message}</Text>

        {!!secondaryText && !compact && <Text style={styles.secondary}>{secondaryText}</Text>}

        {showStoreButtons && (
          <View style={styles.buttonsRow}>
            {!hidePlayStoreButton && (
              <TouchableOpacity
                style={[styles.ctaBtn, styles.playBtn]}
                onPress={() => onPressStore("play")}
                activeOpacity={0.85}
              >
                <MaterialIcons name="shop" size={18} color={colors.white} />
                <Text style={styles.ctaText}>Google Play</Text>
              </TouchableOpacity>
            )}

            {!hideAppStoreButton && (
              <TouchableOpacity
                style={[styles.ctaBtn, styles.appBtn]}
                onPress={() => onPressStore("app")}
                activeOpacity={0.85}
              >
                <MaterialIcons name="apple" size={18} color={colors.white} />
                <Text style={styles.ctaText}>App Store</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!!onContinue && (
          <TouchableOpacity style={styles.continueBtn} onPress={onContinue} activeOpacity={0.85}>
            <Text style={styles.continueText}>{continueLabel || "Continue on Web"}</Text>
          </TouchableOpacity>
        )}

        {Platform.OS === "web" && !compact ? (
          <Text style={styles.footnote}>This feature is optimized for mobile for the best experience.</Text>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors, { variant, compact }) {
  const isFull = variant === "full";
  return StyleSheet.create({
    outer: {
      flex: isFull ? 1 : undefined,
      alignItems: "center",
      justifyContent: isFull ? "center" : undefined,
      padding: isFull ? layout.screenPadding : 0,
    },
    card: {
      width: "100%",
      maxWidth: 460,
      backgroundColor: colors.surface,
      borderRadius: radii.card,
      padding: compact ? spacing.lg : layout.cardPadding,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    hero: { alignItems: "center", marginBottom: compact ? spacing.md : spacing.lg },
    iconWrap: {
      width: compact ? 54 : 70,
      height: compact ? 54 : 70,
      borderRadius: 999,
      backgroundColor: colors.primary + "12",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.primary + "22",
    },
    title: {
      fontSize: compact ? 16 : 20,
      fontWeight: "900",
      color: colors.text,
      textAlign: "center",
    },
    message: {
      marginTop: spacing.sm,
      fontSize: compact ? 13 : 14,
      lineHeight: compact ? 18 : 20,
      color: colors.textSecondary,
      textAlign: "center",
    },
    secondary: {
      marginTop: spacing.md,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
    },
    buttonsRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: compact ? spacing.md : spacing.lg,
    },
    ctaBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: spacing.md,
      borderRadius: radii.button,
    },
    playBtn: { backgroundColor: colors.primary },
    appBtn: { backgroundColor: colors.text },
    ctaText: { color: colors.white, fontWeight: "800" },
    continueBtn: {
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      alignItems: "center",
    },
    continueText: { color: colors.primary, fontWeight: "700" },
    footnote: {
      marginTop: spacing.md,
      fontSize: 11,
      color: colors.textMuted,
      textAlign: "center",
    },
  });
}

