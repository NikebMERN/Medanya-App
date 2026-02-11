import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";
import { formatTime } from "../utils/format";

/**
 * Renders a single message bubble. Types: text, image, voice, video (display only).
 */
export default function ChatMessage({ message, isOwn, pending }) {
  const colors = useThemeColors();
  const styles = createStyles(colors, isOwn);

  const type = message?.type || "text";
  const text = message?.text || "";
  const mediaUrl = message?.mediaUrl || "";
  const createdAt = message?.createdAt;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.bubble, pending && styles.bubblePending]}>
        {type === "text" && <Text style={styles.text}>{text}</Text>}
        {type === "image" && mediaUrl ? (
          <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
        ) : type === "image" ? (
          <Text style={styles.placeholder}>[Image]</Text>
        ) : null}
        {type === "video" && mediaUrl ? (
          <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
        ) : type === "video" ? (
          <Text style={styles.placeholder}>[Video]</Text>
        ) : null}
        {type === "voice" && (
          <Text style={styles.placeholder}>{mediaUrl ? "🎙️ Voice" : "[Voice]"}</Text>
        )}
        {createdAt && (
          <Text style={styles.time}>{formatTime(createdAt)}</Text>
        )}
      </View>
    </View>
  );
}

function createStyles(colors, isOwn) {
  return StyleSheet.create({
    wrapper: {
      alignItems: isOwn ? "flex-end" : "flex-start",
      marginVertical: spacing.xs,
      marginHorizontal: spacing.md,
    },
    bubble: {
      maxWidth: "80%",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 16,
      backgroundColor: isOwn ? colors.primary : colors.surfaceLight,
    },
    bubblePending: {
      opacity: 0.8,
    },
    text: {
      fontSize: 15,
      color: isOwn ? colors.white : colors.text,
    },
    media: {
      width: 200,
      height: 150,
      borderRadius: 8,
    },
    placeholder: {
      fontSize: 14,
      color: isOwn ? colors.white : colors.textMuted,
    },
    time: {
      fontSize: 11,
      color: isOwn ? "rgba(255,255,255,0.8)" : colors.textMuted,
      marginTop: spacing.xs,
    },
  });
}
