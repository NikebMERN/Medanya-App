/**
 * JOB CARD — Banner style (large image like marketplace), then body, CTAs, like/comment/share.
 */
import React, { useState } from "react";
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

const BANNER_HEIGHT = 180;

export default function JobCard({ data, onPress, onChat, onApply, onLike, onComment, onShare }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [liked, setLiked] = useState(false);

  const title = data?.title ?? "Job";
  const salary = data?.preview?.salary ?? "";
  const location = data?.location ?? "";
  const category = data?.preview?.category ?? "";
  const imageUrl = data?.preview?.imageUrl;

  const handleLike = (e) => {
    e?.stopPropagation?.();
    setLiked((v) => !v);
    onLike?.();
  };
  const handleComment = (e) => {
    e?.stopPropagation?.();
    onComment?.();
  };
  const handleShare = (e) => {
    e?.stopPropagation?.();
    onShare?.();
  };

  return (
    <TouchableOpacity onPress={() => onPress?.()} activeOpacity={0.9}>
      <NeoCard style={styles.card}>
        <View style={styles.bannerWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.banner} resizeMode="cover" />
          ) : (
            <View style={[styles.banner, styles.bannerPlaceholder]}>
              <MaterialIcons name="work" size={48} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.bannerBadge}>
            <View style={[styles.tag, { backgroundColor: colors.primary + "e6" }]}>
              <Text style={styles.tagText}>JOB</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
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

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={[styles.ctaPrimary, { backgroundColor: colors.primary }]}
              onPress={(e) => { e?.stopPropagation?.(); onChat?.(); }}
            >
              <MaterialIcons name="chat" size={18} color="#fff" />
              <Text style={styles.ctaPrimaryText}>Chat Employer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctaSecondary, { borderColor: colors.primary }]}
              onPress={(e) => { e?.stopPropagation?.(); onApply?.(); }}
            >
              <Text style={[styles.ctaSecondaryText, { color: colors.primary }]}>Apply</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleLike} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name={liked ? "favorite" : "favorite-border"} size={20} color={liked ? (colors.error || "#e53935") : colors.textMuted} />
              <Text style={styles.actionLabel}>Like</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleComment} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="comment" size={20} color={colors.textMuted} />
              <Text style={styles.actionLabel}>Comment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="share" size={20} color={colors.textMuted} />
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </NeoCard>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
    bannerWrap: { position: "relative", height: BANNER_HEIGHT, width: "100%", overflow: "hidden", borderTopLeftRadius: 12, borderTopRightRadius: 12 },
    banner: { width: "100%", height: BANNER_HEIGHT },
    bannerPlaceholder: { backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    bannerBadge: { position: "absolute", top: spacing.sm, left: spacing.sm },
    tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    tagText: { fontSize: 11, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
    body: { padding: spacing.md },
    title: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.sm },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 13, color: colors.textSecondary },
    ctaRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    ctaPrimary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
    ctaPrimaryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    ctaSecondary: { paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 10, borderWidth: 1, justifyContent: "center" },
    ctaSecondaryText: { fontWeight: "600", fontSize: 14 },
    actionRow: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginRight: spacing.lg },
    actionLabel: { fontSize: 13, color: colors.textMuted },
  });
}
