/**
 * JOB CARD — Feed style (hsd): header, banner, JOB badge, body, CTAs, engagement bar.
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";
import FeedCardShell from "./FeedCardShell";

const BANNER_HEIGHT = 160;

export default function JobCard({ data, onPress, onChat, onApply }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const title = data?.title ?? "Job";
  const salary = data?.preview?.salary ?? "";
  const location = data?.location ?? "";
  const category = data?.preview?.category ?? "";
  const imageUrl = data?.preview?.imageUrl;

  return (
    <TouchableOpacity onPress={() => onPress?.()} activeOpacity={0.95}>
      <FeedCardShell authorName={category || "Employer"} createdAt={data?.createdAt}>
        <View style={styles.bannerWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.banner} resizeMode="cover" />
          ) : (
            <View style={[styles.banner, styles.bannerPlaceholder]}>
              <MaterialIcons name="work" size={48} color={colors.textMuted} />
            </View>
          )}
          <View style={[styles.jobBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.jobBadgeText}>JOB</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{title}</Text>
        {(salary || location) ? (
          <View style={styles.metaRow}>
            {salary ? (
              <View style={styles.metaItem}>
                <MaterialIcons name="attach-money" size={16} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{salary}</Text>
              </View>
            ) : null}
            {location ? (
              <View style={styles.metaItem}>
                <MaterialIcons name="location-on" size={14} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>{location}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={[styles.ctaPrimary, { backgroundColor: colors.primary }]}
            onPress={(e) => { e?.stopPropagation?.(); onChat?.(); }}
          >
            <MaterialIcons name="chat" size={18} color="#fff" />
            <Text style={styles.ctaText}>Chat Employer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctaSecondary, { borderColor: colors.primary }]}
            onPress={(e) => { e?.stopPropagation?.(); onApply?.(); }}
          >
            <Text style={[styles.ctaSecondaryText, { color: colors.primary }]}>Apply</Text>
          </TouchableOpacity>
        </View>
      </FeedCardShell>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    bannerWrap: { position: "relative", height: BANNER_HEIGHT, borderRadius: 12, overflow: "hidden", marginBottom: spacing.sm },
    banner: { width: "100%", height: BANNER_HEIGHT },
    bannerPlaceholder: { backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    jobBadge: { position: "absolute", top: spacing.sm, left: spacing.sm, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    jobBadgeText: { fontSize: 11, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
    title: { fontSize: 16, fontWeight: "700", marginBottom: spacing.sm },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.sm },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 13 },
    ctaRow: { flexDirection: "row", gap: spacing.sm },
    ctaPrimary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12 },
    ctaSecondary: { paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: 12, borderWidth: 1, justifyContent: "center" },
    ctaText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    ctaSecondaryText: { fontWeight: "600", fontSize: 14 },
  });
}
