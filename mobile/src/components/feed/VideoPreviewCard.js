/**
 * VIDEO PREVIEW CARD — 16:9 thumbnail with play icon overlay.
 * Footer: creator avatar + caption + like count
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const ASPECT = 16 / 9;
const THUMB_HEIGHT = Math.round(CARD_WIDTH / ASPECT);

export default function VideoPreviewCard({ data, onPress }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const thumbnailUrl = data?.preview?.thumbnailUrl ?? data?.preview?.videoUrl;
  const caption = data?.title ?? "";
  const likeCount = data?.preview?.likeCount ?? 0;
  const commentCount = data?.preview?.commentCount ?? 0;

  return (
    <TouchableOpacity onPress={() => onPress?.()} activeOpacity={0.95}>
      <View style={styles.card}>
        <View style={styles.thumbWrap}>
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <MaterialIcons name="videocam" size={48} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.playOverlay}>
            <View style={styles.playBtn}>
              <MaterialIcons name="play-arrow" size={40} color="#fff" />
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.avatarPlaceholder}>
            <MaterialIcons name="person" size={20} color={colors.textMuted} />
          </View>
          <View style={styles.footerBody}>
            <Text style={styles.caption} numberOfLines={1}>{caption}</Text>
            <View style={styles.stats}>
              <MaterialIcons name="favorite" size={14} color={colors.textMuted} />
              <Text style={styles.statsText}>{likeCount}</Text>
              <MaterialIcons name="chat-bubble-outline" size={14} color={colors.textMuted} style={styles.statIcon} />
              <Text style={styles.statsText}>{commentCount}</Text>
            </View>
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
    thumbWrap: { position: "relative", width: CARD_WIDTH, height: THUMB_HEIGHT },
    thumb: { width: "100%", height: "100%" },
    thumbPlaceholder: { backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.2)",
    },
    playBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
    },
    footer: { flexDirection: "row", alignItems: "center", padding: spacing.md },
    avatarPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.sm,
    },
    footerBody: { flex: 1, minWidth: 0 },
    caption: { fontSize: 14, fontWeight: "600", color: colors.text },
    stats: { flexDirection: "row", alignItems: "center", marginTop: 2 },
    statsText: { fontSize: 12, color: colors.textMuted, marginLeft: 4 },
    statIcon: { marginLeft: spacing.sm },
  });
}
