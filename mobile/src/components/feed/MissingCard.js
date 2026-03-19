/**
 * MISSING PERSON CARD — Feed style (mhsd design).
 * Header (Family Support, time), purple URGENT badge, description, large image, engagement bar.
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";
import FeedCardShell from "./FeedCardShell";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - spacing.md * 4;
const IMAGE_HEIGHT = 200;

export default function MissingCard({ data, onPress, onCall, onShare }) {
  const colors = useThemeColors();
  const photoUrl = data?.preview?.photoUrl ?? data?.photoUrl;
  const title = data?.title ?? "Missing Person";
  const name = title.replace(/^Missing: /, "");
  const summary = data?.summary ?? data?.description ?? "";
  const location = data?.location ?? "";

  return (
    <TouchableOpacity onPress={() => onPress?.()} activeOpacity={0.95}>
      <FeedCardShell authorName="Family Support" createdAt={data?.createdAt}>
        <View style={[styles.urgentBadge, { backgroundColor: "#7c3aed" }]}>
          <MaterialIcons name="person" size={12} color="#fff" style={styles.urgentIcon} />
          <Text style={styles.urgentText}>+ URGENT</Text>
        </View>

        <Text style={[styles.description, { color: colors.text }]}>
          MISSING: {summary || `Last seen at ${location || "unknown location"}. Please contact if seen.`}
        </Text>

        <View style={styles.imageWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <MaterialIcons name="person" size={64} color={colors.textMuted} />
            </View>
          )}
        </View>

        <View style={[styles.ctaRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.ctaPrimary, { backgroundColor: colors.success }]}
            onPress={(e) => { e?.stopPropagation?.(); onCall?.(); }}
          >
            <MaterialIcons name="call" size={18} color="#fff" />
            <Text style={styles.ctaText}>Call Family</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctaSecondary, { borderColor: colors.border }]}
            onPress={(e) => { e?.stopPropagation?.(); onShare?.(); }}
          >
            <MaterialIcons name="share" size={18} color={colors.text} />
            <Text style={[styles.ctaTextSecondary, { color: colors.text }]}>Share Case</Text>
          </TouchableOpacity>
        </View>
      </FeedCardShell>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: spacing.sm,
  },
  urgentIcon: { marginRight: 6 },
  urgentText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  description: { fontSize: 15, lineHeight: 22, marginBottom: spacing.md },
  imageWrap: { borderRadius: 12, overflow: "hidden", marginBottom: spacing.md },
  image: { width: "100%", height: IMAGE_HEIGHT },
  imagePlaceholder: { backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  ctaRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  ctaPrimary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  ctaSecondary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  ctaText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  ctaTextSecondary: { fontWeight: "600", fontSize: 14 },
});
