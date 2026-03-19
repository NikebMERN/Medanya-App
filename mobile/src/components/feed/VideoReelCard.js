/**
 * VideoReelCard — Instagram-style vertical video card for horizontal scroll.
 * Compact, tall, play overlay, like/comment counts.
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";

const CARD_WIDTH = 120;
const CARD_HEIGHT = 180;

export default function VideoReelCard({ data, onPress }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const thumbnailUrl = data?.preview?.thumbnailUrl ?? data?.preview?.videoUrl;
  const caption = data?.title ?? "Video";
  const likeCount = data?.preview?.likeCount ?? 0;
  const commentCount = data?.preview?.commentCount ?? 0;
  const formatCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.()} activeOpacity={0.9}>
      <View style={styles.thumbWrap}>
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <MaterialIcons name="videocam" size={32} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.playOverlay}>
          <MaterialIcons name="play-arrow" size={32} color="rgba(255,255,255,0.9)" />
        </View>
        <View style={styles.stats}>
          <MaterialIcons name="favorite" size={12} color="#fff" />
          <Text style={styles.statsText}>{formatCount(likeCount)}</Text>
          <MaterialIcons name="chat-bubble" size={12} color="#fff" style={styles.statIcon} />
          <Text style={styles.statsText}>{formatCount(commentCount)}</Text>
        </View>
      </View>
      <Text style={[styles.caption, { color: colors.text }]} numberOfLines={2}>{caption}</Text>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      width: CARD_WIDTH,
      marginRight: spacing.sm,
    },
    thumbWrap: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.surfaceLight,
    },
    thumb: { width: "100%", height: "100%" },
    thumbPlaceholder: { justifyContent: "center", alignItems: "center" },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.2)",
    },
    stats: {
      position: "absolute",
      bottom: 6,
      left: 6,
      right: 6,
      flexDirection: "row",
      alignItems: "center",
    },
    statsText: { fontSize: 10, color: "#fff", marginLeft: 2, fontWeight: "600" },
    statIcon: { marginLeft: 8 },
    caption: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  });
}
