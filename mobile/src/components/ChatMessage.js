import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Image, Pressable, Animated } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";
import { formatTime } from "../utils/format";
import VoiceMessagePlayer from "./VoiceMessagePlayer";

/**
 * Renders a single message bubble (Telegram/Instagram style).
 * - Private chat: no avatar. Group: sender avatar to the left of bubble (behind text).
 * - showAvatarBottom + avatarUrl: show sender avatar to the left of bubble (last message in streak).
 */
export default function ChatMessage({
  message,
  isOwn,
  pending,
  showAvatarBottom = false,
  avatarUrl = null,
  seen = false,
  onLongPress,
  onMediaPress,
  isGroupChat = false,
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors, isOwn);
  const showAvatar = isGroupChat && showAvatarBottom && !isOwn;
  const uploading = message?.uploading === true;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pending) return;
    const anim = (v, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 200, useNativeDriver: true }),
        ])
      );
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 80);
    const a3 = anim(dot3, 160);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [pending, dot1, dot2, dot3]);

  const type = message?.type || "text";
  const text = message?.text || "";
  const mediaUrl = message?.mediaUrl || "";
  const createdAt = message?.createdAt;

  const timeRow = (
    <View style={styles.footerRow}>
      {createdAt ? (
        <Text style={styles.time} numberOfLines={1}>
          {formatTime(createdAt)}
        </Text>
      ) : null}
      {isOwn && !pending && (
        <MaterialIcons
          name={seen ? "done-all" : "done"}
          size={14}
          color="rgba(255,255,255,0.9)"
          style={styles.checkIcon}
        />
      )}
      {isOwn && pending && (
        <View style={styles.pendingDots}>
          <Animated.View style={[styles.pendingDot, { opacity: dot1.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }]} />
          <Animated.View style={[styles.pendingDot, { opacity: dot2.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }]} />
          <Animated.View style={[styles.pendingDot, { opacity: dot3.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }]} />
        </View>
      )}
    </View>
  );

  const bubbleContent = (
    <>
          {timeRow}
          {type === "text" && <Text style={styles.text}>{text}</Text>}
          {type === "image" && mediaUrl ? (
            <View style={styles.mediaWrap}>
              <Pressable onPress={!uploading && onMediaPress ? () => onMediaPress(mediaUrl, "image") : undefined}>
                <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
              </Pressable>
              {uploading && (
                <View style={styles.mediaLoadingOverlay}>
                  <View style={[styles.mediaLoadingCircle, { borderColor: colors.primary }]} />
                </View>
              )}
            </View>
          ) : type === "image" ? (
            <Text style={styles.placeholder}>[Image]</Text>
          ) : null}
          {type === "video" && mediaUrl ? (
            <View style={styles.mediaWrap}>
              <Pressable onPress={!uploading && onMediaPress ? () => onMediaPress(mediaUrl, "video") : undefined}>
                <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
              </Pressable>
              {uploading && (
                <View style={styles.mediaLoadingOverlay} />
              )}
            </View>
          ) : type === "video" ? (
            <Text style={styles.placeholder}>[Video]</Text>
          ) : null}
          {type === "file" && (
            <View style={styles.fileRow}>
              <MaterialIcons name="insert-drive-file" size={24} color={isOwn ? colors.white : colors.primary} />
              <Text style={[styles.fileLabel, { color: isOwn ? colors.white : colors.text }]}>File</Text>
            </View>
          )}
          {type === "location" && (
            <View style={styles.fileRow}>
              <MaterialIcons name="location-on" size={24} color={isOwn ? colors.white : colors.primary} />
              <Text style={[styles.fileLabel, { color: isOwn ? colors.white : colors.text }]}>Location shared</Text>
            </View>
          )}
          {type === "poll" && (
            <View style={styles.fileRow}>
              <MaterialIcons name="poll" size={24} color={isOwn ? colors.white : colors.primary} />
              <Text style={[styles.fileLabel, { color: isOwn ? colors.white : colors.text }]}>Poll</Text>
            </View>
          )}
          {type === "contact" && (
            <View style={styles.fileRow}>
              <MaterialIcons name="person" size={24} color={isOwn ? colors.white : colors.primary} />
              <Text style={[styles.fileLabel, { color: isOwn ? colors.white : colors.text }]}>Contact</Text>
            </View>
          )}
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
        {showAvatar && (
          <View style={styles.avatarWrapLeft}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>?</Text>
              </View>
            )}
          </View>
        )}
        <Pressable
          style={[styles.bubble, pending && styles.bubblePending]}
          onLongPress={onLongPress ? () => onLongPress(message) : undefined}
          delayLongPress={400}
        >
          {bubbleContent}
        </Pressable>
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
    mediaWrap: { marginBottom: 2 },
    media: {
      width: 220,
      height: 160,
      borderRadius: 10,
    },
    placeholder: {
      fontSize: 14,
      color: isOwn ? colors.white : colors.textMuted,
      marginBottom: 2,
    },
    fileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 2,
    },
    fileLabel: {
      fontSize: 15,
      fontWeight: "500",
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
    avatarWrapLeft: {
      marginRight: 6,
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
    pendingDots: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginLeft: 4,
    },
    pendingDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.9)",
    },
    mediaLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.35)",
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    mediaLoadingCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 3,
      borderTopColor: "transparent",
    },
  });
}
