/**
 * FeedCardShell — Shared layout for feed cards: header (avatar, author, time, menu) + content + engagement bar.
 * Matches hsd/mhsd design reference.
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";

function formatTimeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "JUST NOW";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}M`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}H`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}D`;
  return d.toLocaleDateString();
}

export default function FeedCardShell({
  authorName = "Community",
  authorAvatar,
  createdAt,
  onMenuPress,
  children,
  engagement = {},
  onLike,
  onComment,
  onShare,
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const timeAgo = formatTimeAgo(createdAt);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.surfaceLight }]}>
          {authorAvatar ? null : <MaterialIcons name="group" size={20} color={colors.textMuted} />}
        </View>
        <View style={styles.headerBody}>
          <Text style={[styles.author, { color: colors.text }]} numberOfLines={1}>{authorName}</Text>
          {timeAgo ? <Text style={[styles.timeAgo, { color: colors.textMuted }]}>{timeAgo} AGO</Text> : null}
        </View>
        {onMenuPress ? (
          <TouchableOpacity onPress={onMenuPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="more-horiz" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.content}>{children}</View>

      {(engagement.likeCount != null || engagement.commentCount != null || onShare) && (
        <View style={[styles.engagementBar, { borderTopColor: colors.border }]}>
          {engagement.likeCount != null && (
            <TouchableOpacity style={styles.engagementBtn} onPress={onLike} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="favorite-border" size={20} color={colors.textMuted} />
              <Text style={[styles.engagementLabel, { color: colors.textMuted }]}>{engagement.likeCount}</Text>
            </TouchableOpacity>
          )}
          {engagement.commentCount != null && (
            <TouchableOpacity style={styles.engagementBtn} onPress={onComment} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="chat-bubble-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.engagementLabel, { color: colors.textMuted }]}>{engagement.commentCount}</Text>
            </TouchableOpacity>
          )}
          {onShare && (
            <TouchableOpacity style={styles.engagementBtn} onPress={onShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="share" size={20} color={colors.textMuted} />
              <Text style={[styles.engagementLabel, { color: colors.textMuted }]}>Share</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.sm,
    },
    headerBody: { flex: 1, minWidth: 0 },
    author: { fontSize: 15, fontWeight: "700" },
    timeAgo: { fontSize: 11, marginTop: 2 },
    content: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
    engagementBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderTopWidth: 1,
      gap: spacing.lg,
    },
    engagementBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
    engagementLabel: { fontSize: 14 },
  });
}
