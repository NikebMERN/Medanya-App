/**
 * MISSING PERSON CARD — Urgent highlight.
 * Large image banner, MISSING badge, name + age overlay, CTA: Call Family + Share
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const BANNER_HEIGHT = 180;

export default function MissingCard({ data, onPress, onCall, onShare }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const photoUrl = data?.preview?.photoUrl ?? data?.photoUrl;
  const title = data?.title ?? "Missing Person";
  const location = data?.location ?? "";
  const createdAt = data?.createdAt;

  return (
    <TouchableOpacity onPress={() => onPress?.()} activeOpacity={0.95}>
      <View style={styles.card}>
        <View style={styles.banner}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.bannerImage} resizeMode="cover" />
          ) : (
            <View style={[styles.bannerImage, styles.bannerPlaceholder]}>
              <MaterialIcons name="person" size={64} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>MISSING</Text>
          </View>
          <View style={styles.overlay}>
            <Text style={styles.overlayName} numberOfLines={1}>{title.replace(/^Missing: /, "")}</Text>
            {location ? <Text style={styles.overlayLocation} numberOfLines={1}>{location}</Text> : null}
          </View>
        </View>

        <View style={styles.body}>
          {createdAt ? (
            <Text style={styles.dateText}>
              {new Date(createdAt).toLocaleDateString()} • Urgent
            </Text>
          ) : null}

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={[styles.ctaPrimary, { backgroundColor: colors.success }]}
              onPress={() => onCall?.()}
            >
              <MaterialIcons name="call" size={18} color="#fff" />
              <Text style={styles.ctaPrimaryText}>Call Family</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctaSecondary, { borderColor: colors.primary }]}
              onPress={() => onShare?.()}
            >
              <MaterialIcons name="share" size={18} color={colors.primary} />
              <Text style={[styles.ctaSecondaryText, { color: colors.primary }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    banner: { height: BANNER_HEIGHT, position: "relative" },
    bannerImage: { width: "100%", height: "100%" },
    bannerPlaceholder: { backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    badge: {
      position: "absolute",
      top: spacing.sm,
      left: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(229,57,53,0.9)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff", marginRight: 6 },
    badgeText: { fontSize: 11, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
    overlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: spacing.md,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    overlayName: { fontSize: 18, fontWeight: "800", color: "#fff" },
    overlayLocation: { fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 2 },
    body: { padding: spacing.md },
    dateText: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
    ctaRow: { flexDirection: "row", gap: spacing.sm },
    ctaPrimary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
    ctaPrimaryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    ctaSecondary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
    ctaSecondaryText: { fontWeight: "600", fontSize: 14 },
  });
}
