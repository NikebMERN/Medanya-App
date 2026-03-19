/**
 * VIDEO PREVIEW CARD — vsd design: large video, play overlay, engagement icons on right side.
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = spacing.md * 2;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING;
const ASPECT = 16 / 9;
const THUMB_HEIGHT = Math.round(CARD_WIDTH / ASPECT);

export default function VideoPreviewCard({ data, onPress, onShare }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const thumbnailUrl = data?.preview?.thumbnailUrl ?? data?.preview?.videoUrl;
  const caption = data?.title ?? "Medanya Live";
  const likeCount = data?.preview?.likeCount ?? 0;
  const commentCount = data?.preview?.commentCount ?? 0;

  const formatCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

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
              <MaterialIcons name="play-arrow" size={48} color="#fff" />
            </View>
          </View>

          {/* Engagement icons on right (vsd design) */}
          <View style={styles.rightEngagement}>
            <View style={styles.engagementItem}>
              <View style={styles.engagementCircle}>
                <MaterialIcons name="favorite-border" size={22} color="#fff" />
              </View>
              <Text style={styles.engagementCount}>{formatCount(likeCount)}</Text>
            </View>
            <View style={styles.engagementItem}>
              <View style={styles.engagementCircle}>
                <MaterialIcons name="chat-bubble-outline" size={20} color="#fff" />
              </View>
              <Text style={styles.engagementCount}>{formatCount(commentCount)}</Text>
            </View>
            <View style={styles.engagementItem}>
              <View style={styles.engagementCircle}>
                <MaterialIcons name="share" size={20} color="#fff" />
              </View>
              <Text style={styles.engagementLabel}>Share</Text>
            </View>
          </View>

          {/* Title bottom-left */}
          <View style={styles.titleOverlay}>
            <Text style={styles.title} numberOfLines={1}>{caption}</Text>
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
    thumbWrap: { position: "relative", width: CARD_WIDTH, height: THUMB_HEIGHT },
    thumb: { width: "100%", height: "100%" },
    thumbPlaceholder: { backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.15)",
    },
    playBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    rightEngagement: {
      position: "absolute",
      right: spacing.sm,
      top: spacing.lg,
      bottom: spacing.lg,
      justifyContent: "space-around",
      alignItems: "center",
    },
    engagementItem: { alignItems: "center" },
    engagementCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 4,
    },
    engagementCount: { fontSize: 12, fontWeight: "600", color: "#fff" },
    engagementLabel: { fontSize: 11, fontWeight: "600", color: "#fff" },
    titleOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 60,
      padding: spacing.md,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    title: { fontSize: 16, fontWeight: "700", color: "#fff" },
  });
}
