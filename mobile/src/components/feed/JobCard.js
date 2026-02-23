/**
 * JOB CARD — Instagram/Facebook post style.
 * Header: avatar + title + JOB tag | Body: salary + location | Chips | CTA: Chat Employer + Apply
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import NeoCard from "../ui/NeoCard";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";

export default function JobCard({ data, onPress, onChat, onApply }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const title = data?.title ?? "Job";
  const salary = data?.preview?.salary ?? "";
  const location = data?.location ?? "";
  const category = data?.preview?.category ?? "";
  const imageUrl = data?.preview?.imageUrl;

  return (
    <TouchableOpacity onPress={() => onPress?.()} activeOpacity={0.9}>
      <NeoCard style={styles.card}>
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialIcons name="work" size={24} color={colors.textMuted} />
              </View>
            )}
          </View>
          <View style={styles.headerBody}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <View style={styles.tagRow}>
              <View style={[styles.tag, { backgroundColor: colors.primary + "25" }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>JOB</Text>
              </View>
              {category ? (
                <Text style={styles.subtitle} numberOfLines={1}>{category}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {(salary || location) ? (
          <View style={styles.metaRow}>
            {salary ? (
              <View style={styles.metaItem}>
                <MaterialIcons name="attach-money" size={16} color={colors.textMuted} />
                <Text style={styles.metaText}>{salary}</Text>
              </View>
            ) : null}
            {location ? (
              <View style={styles.metaItem}>
                <MaterialIcons name="location-on" size={14} color={colors.textMuted} />
                <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.chipsRow}>
          <View style={[styles.chip, { backgroundColor: colors.surfaceLight }]}>
            <Text style={styles.chipText}>Full-time</Text>
          </View>
        </View>

        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={[styles.ctaPrimary, { backgroundColor: colors.primary }]}
            onPress={() => onChat?.()}
          >
            <MaterialIcons name="chat" size={18} color="#fff" />
            <Text style={styles.ctaPrimaryText}>Chat Employer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctaSecondary, { borderColor: colors.primary }]}
            onPress={() => onApply?.()}
          >
            <Text style={[styles.ctaSecondaryText, { color: colors.primary }]}>Apply</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <MaterialIcons name="verified" size={14} color={colors.success} />
          <Text style={styles.verifiedText}>Verified employer</Text>
          <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.reportBtn}>
            <MaterialIcons name="more-vert" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </NeoCard>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
    header: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.sm },
    avatarWrap: { marginRight: spacing.sm },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarPlaceholder: { backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    headerBody: { flex: 1, minWidth: 0 },
    title: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 2 },
    tagRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    tagText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
    subtitle: { fontSize: 12, color: colors.textMuted, flex: 1 },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.sm },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 13, color: colors.textSecondary },
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
    chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
    chipText: { fontSize: 12, color: colors.textSecondary },
    ctaRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
    ctaPrimary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
    ctaPrimaryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    ctaSecondary: { paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 10, borderWidth: 1, justifyContent: "center" },
    ctaSecondaryText: { fontWeight: "600", fontSize: 14 },
    footer: { flexDirection: "row", alignItems: "center", gap: 4 },
    verifiedText: { fontSize: 12, color: colors.textMuted },
    reportBtn: { marginLeft: "auto", padding: 4 },
  });
}
