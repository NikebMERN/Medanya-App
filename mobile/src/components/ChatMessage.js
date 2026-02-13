import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";
import { formatTime } from "../utils/format";
import VoiceMessagePlayer from "./VoiceMessagePlayer";

/**
 * Renders a single message bubble (Telegram/Instagram style).
 * - Time in smaller text inside bubble, bottom-right.
 * - Own messages: single check (sent), double check (seen).
 * - showAvatarBottom + avatarUrl: show sender avatar below bubble (for last message in streak).
 */
export default function ChatMessage({
  message,
  isOwn,
  pending,
  showAvatarBottom = false,
  avatarUrl = null,
  seen = false,
  onLongPress,
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors, isOwn);

  const type = message?.type || "text";
  const text = message?.text || "";
  const mediaUrl = message?.mediaUrl || "";
  const createdAt = message?.createdAt;

  const bubbleContent = (
    <>
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
            mediaUrl ? (
              <VoiceMessagePlayer
                mediaUrl={mediaUrl}
                isOwn={isOwn}
                createdAt={createdAt}
              />
            ) : (
              <Text style={styles.placeholder}>[Voice]</Text>
            )
          )}
          {(type !== "voice" || !mediaUrl) && (
            <View style={styles.footerRow}>
              {createdAt ? (
                <Text style={styles.time} numberOfLines={1}>
                  {formatTime(createdAt)}
                </Text>
              ) : null}
              {isOwn && (
                <MaterialIcons
                  name={seen ? "done-all" : "done"}
                  size={14}
                  color="rgba(255,255,255,0.9)"
                  style={styles.checkIcon}
                />
              )}
            </View>
          )}
          {type === "voice" && mediaUrl && isOwn && (
            <View style={styles.footerRow}>
              <MaterialIcons
                name={seen ? "done-all" : "done"}
                size={14}
                color="rgba(255,255,255,0.9)"
                style={styles.checkIcon}
              />
            </View>
          )}
    </>
  );

  return (
    <View style={styles.wrapper}>
      <View style={[styles.bubbleRow, !isOwn && styles.bubbleRowLeft]}>
        <Pressable
          style={[styles.bubble, pending && styles.bubblePending]}
          onLongPress={onLongPress ? () => onLongPress(message) : undefined}
          delayLongPress={400}
        >
          {bubbleContent}
        </Pressable>
        {showAvatarBottom && (
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>?</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(colors, isOwn) {
  return StyleSheet.create({
    wrapper: {
      alignItems: isOwn ? "flex-end" : "flex-start",
      marginVertical: 2,
      marginHorizontal: spacing.md,
    },
    bubbleRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      maxWidth: "85%",
      gap: 6,
    },
    bubbleRowLeft: {
      flexDirection: "row",
    },
    bubble: {
      maxWidth: "100%",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 18,
      borderBottomRightRadius: isOwn ? 4 : 18,
      borderBottomLeftRadius: isOwn ? 18 : 4,
      backgroundColor: isOwn ? colors.primary : colors.surfaceLight,
    },
    bubblePending: {
      opacity: 0.85,
    },
    text: {
      fontSize: 16,
      color: isOwn ? colors.white : colors.text,
      marginBottom: 2,
    },
    media: {
      width: 220,
      height: 160,
      borderRadius: 10,
      marginBottom: 2,
    },
    placeholder: {
      fontSize: 14,
      color: isOwn ? colors.white : colors.textMuted,
      marginBottom: 2,
    },
    footerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
      marginTop: 2,
    },
    time: {
      fontSize: 11,
      color: isOwn ? "rgba(255,255,255,0.8)" : colors.textMuted,
    },
    checkIcon: {
      marginLeft: 0,
    },
    avatarWrap: {
      marginLeft: 2,
      marginBottom: 2,
    },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    avatarPlaceholder: {
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarLetter: {
      color: colors.white,
      fontSize: 12,
      fontWeight: "600",
    },
  });
}
