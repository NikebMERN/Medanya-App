/**
 * GalleryBannerCard — Image/gallery post for horizontal banner. Like, share, comment on the card.
 * Same reel size as VideoReelCard; engagement icons on the side or bottom.
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";

const CARD_WIDTH = 140;
const CARD_HEIGHT = 180;

export default function GalleryBannerCard({ data, onPress, onShare }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const imageUrl = data?.preview?.imageUrl ?? data?.preview?.imageUrls?.[0] ?? data?.imageUrl;
  const caption = data?.title ?? "Post";
  const likeCount = data?.preview?.likeCount ?? 0;
  const commentCount = data?.preview?.commentCount ?? 0;
  const formatCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.()} activeOpacity={0.9}>
      <View style={styles.thumbWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <MaterialIcons name="image" size={32} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.engagement}>
          <View style={styles.engagementItem}>
            <MaterialIcons name="favorite-border" size={16} color="#fff" />
            <Text style={styles.engagementCount}>{formatCount(likeCount)}</Text>
          </View>
          <View style={styles.engagementItem}>
            <MaterialIcons name="chat-bubble-outline" size={14} color="#fff" />
            <Text style={styles.engagementCount}>{formatCount(commentCount)}</Text>
          </View>
          {onShare && (
            <TouchableOpacity style={styles.engagementItem} onPress={(e) => { e?.stopPropagation?.(); onShare?.(); }}>
              <MaterialIcons name="share" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={[styles.caption, { color: colors.text }]} numberOfLines={2}>{caption}</Text>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: { width: CARD_WIDTH, marginRight: spacing.sm },
    thumbWrap: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.surfaceLight,
    },
    thumb: { width: "100%", height: "100%" },
    thumbPlaceholder: { justifyContent: "center", alignItems: "center" },
    engagement: {
      position: "absolute",
      right: 6,
      bottom: 6,
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
    },
    engagementItem: { alignItems: "center" },
    engagementCount: { fontSize: 10, color: "#fff", fontWeight: "600" },
    caption: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  });
}
