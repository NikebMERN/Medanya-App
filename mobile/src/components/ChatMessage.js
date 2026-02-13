import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, Image, Pressable, Animated, TouchableOpacity, Linking, ActivityIndicator, Alert } from "react-native";
import { WebView } from "react-native-webview";
import { MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";
import { formatTime } from "../utils/format";
import VoiceMessagePlayer from "./VoiceMessagePlayer";

function parseJsonSafe(str, fallback = null) {
  if (!str || typeof str !== "string") return fallback;
  try {
    const out = JSON.parse(str);
    return out != null ? out : fallback;
  } catch {
    return fallback;
  }
}

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
  onProfilePress,
  onVotePoll,
  isGroupChat = false,
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, isOwn), [colors, isOwn]);
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
  const [fileOpening, setFileOpening] = useState(false);

  const openFile = useCallback(async (url) => {
    if (!url || fileOpening) return;
    setFileOpening(true);
    try {
      const ext = (url.split(".").pop() || "file").split(/[?#]/)[0] || "file";
      const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext : "file";
      const localPath = `${FileSystem.cacheDirectory}chat_file_${Date.now()}.${safeExt}`;
      const { uri } = await FileSystem.downloadAsync(url, localPath);
      const canOpen = await Linking.canOpenURL(uri);
      if (canOpen) {
        await Linking.openURL(uri);
      } else {
        Alert.alert("Open file", "No app found to open this file. Try saving it from the message menu.");
      }
    } catch (e) {
      try {
        await Linking.openURL(url);
      } catch (e2) {
        Alert.alert("Error", e?.message || e2?.message || "Could not open file.");
      }
    } finally {
      setFileOpening(false);
    }
  }, [fileOpening]);

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
            <TouchableOpacity
              style={[styles.specialCard, isOwn && styles.specialCardOwn]}
              onPress={mediaUrl && !fileOpening ? () => openFile(mediaUrl) : undefined}
              activeOpacity={mediaUrl ? 0.8 : 1}
              disabled={!mediaUrl || fileOpening}
            >
              {fileOpening ? (
                <ActivityIndicator size="small" color={isOwn ? colors.white : colors.primary} style={{ marginVertical: 8 }} />
              ) : (
                <MaterialIcons name="insert-drive-file" size={28} color={isOwn ? colors.white : colors.primary} />
              )}
              <Text style={[styles.specialCardTitle, { color: isOwn ? colors.white : colors.text }]}>File</Text>
              {mediaUrl ? (
                <Text style={[styles.specialCardSub, { color: isOwn ? "rgba(255,255,255,0.8)" : colors.textMuted }]} numberOfLines={1}>
                  {fileOpening ? "Opening…" : "Tap to open"}
                </Text>
              ) : null}
            </TouchableOpacity>
          )}
          {type === "location" && (() => {
            const loc = parseJsonSafe(text, {});
            const lat = loc.lat ?? loc.latitude;
            const lng = loc.lng ?? loc.longitude;
            const hasCoords = lat != null && lng != null;
            const mapUri = hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : null;
            const osmBbox = hasCoords ? `${Number(lng) - 0.02},${Number(lat) - 0.02},${Number(lng) + 0.02},${Number(lat) + 0.02}` : "";
            const osmUrl = hasCoords ? `https://www.openstreetmap.org/export/embed.html?bbox=${osmBbox}&layer=mapnik&marker=${lat},${lng}` : null;
            return (
              <TouchableOpacity
                style={[styles.specialCard, isOwn && styles.specialCardOwn]}
                onPress={mapUri ? () => Linking.openURL(mapUri) : undefined}
                activeOpacity={mapUri ? 0.8 : 1}
              >
                <MaterialIcons name="location-on" size={28} color={isOwn ? colors.white : colors.primary} />
                <Text style={[styles.specialCardTitle, { color: isOwn ? colors.white : colors.text }]}>Location shared</Text>
                {hasCoords && (
                  <>
                    {osmUrl ? (
                      <View style={styles.locationMapWrap}>
                        <WebView source={{ uri: osmUrl }} style={styles.locationMap} scrollEnabled={false} />
                      </View>
                    ) : null}
                    <Text style={[styles.specialCardSub, { color: isOwn ? "rgba(255,255,255,0.8)" : colors.textMuted }]}>Tap to open in Maps</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })()}
          {type === "poll" && (() => {
            const poll = parseJsonSafe(text, { question: "", options: [] });
            const question = poll.question || "Poll";
            const options = Array.isArray(poll.options) ? [...poll.options] : [];
            const rawCounts = message.pollOptionCounts || [];
            const counts = options.map((_, i) => Number(rawCounts[i]) || 0);
            const total = message.pollTotalVotes != null ? message.pollTotalVotes : counts.reduce((s, c) => s + c, 0);
            const userVote = message.pollUserVote != null ? Number(message.pollUserVote) : undefined;
            const maxCount = Math.max(...counts, 1);
            const msgId = message._id || message.id;
            return (
              <View style={[styles.pollCard, isOwn && styles.pollCardOwn]}>
                <View style={styles.pollHeader}>
                  <MaterialIcons name="poll" size={22} color={isOwn ? colors.white : colors.primary} />
                  <Text style={[styles.pollQuestion, { color: isOwn ? colors.white : colors.text }]} numberOfLines={2}>{question}</Text>
                </View>
                {options.length > 0 && (
                  <View style={styles.pollOptionsWrap}>
                    {options.map((opt, i) => {
                      const count = counts[i] || 0;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      const isLeading = total > 0 && count === Math.max(...counts);
                      const isVoted = userVote === i;
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.pollOptionRow,
                            isOwn && styles.pollOptionRowOwn,
                            isLeading && styles.pollOptionRowLeading,
                            isVoted && styles.pollOptionRowVoted,
                          ]}
                          onPress={onVotePoll && msgId ? () => onVotePoll(msgId, i) : undefined}
                          activeOpacity={onVotePoll ? 0.7 : 1}
                          disabled={!onVotePoll}
                        >
                          <View style={[styles.pollOptionBar, { width: `${total > 0 ? (count / maxCount) * 100 : 0}%` }]} />
                          <View style={styles.pollOptionContent}>
                            <Text style={[styles.pollOptionText, { color: isOwn ? colors.white : colors.text }]} numberOfLines={1}>{opt || `Option ${i + 1}`}</Text>
                            {(total > 0 || count > 0) && (
                              <Text style={[styles.pollOptionPct, { color: isOwn ? "rgba(255,255,255,0.9)" : colors.textMuted }]}>
                                {count} vote{count !== 1 ? "s" : ""} · {pct}%
                              </Text>
                            )}
                            {isVoted && <MaterialIcons name="check-circle" size={18} color={isOwn ? colors.white : colors.primary} style={styles.pollOptionCheck} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })()}
          {type === "contact" && (() => {
            const contact = parseJsonSafe(text, { name: "Contact", phones: [] });
            const name = contact.name || "Contact";
            const phones = Array.isArray(contact.phones) ? contact.phones : [];
            return (
              <View style={[styles.contactCard, isOwn && styles.contactCardOwn]}>
                <View style={styles.contactRow}>
                  <View style={[styles.contactAvatar, isOwn && styles.contactAvatarOwn]}>
                    <MaterialIcons name="person" size={24} color={isOwn ? colors.white : colors.primary} />
                  </View>
                  <Text style={[styles.contactName, { color: isOwn ? colors.white : colors.text }]} numberOfLines={1}>{name}</Text>
                </View>
                {phones.length > 0 && (
                  <View style={styles.contactPhones}>
                    {phones.slice(0, 3).map((p, i) => {
                      const num = String(p || "").trim();
                      const display = num.startsWith("+") ? num : `+${num}`;
                      return (
                        <TouchableOpacity key={i} onPress={() => num && Linking.openURL(`tel:${num}`)} style={styles.contactPhoneRow}>
                          <MaterialIcons name="phone" size={14} color={isOwn ? "rgba(255,255,255,0.9)" : colors.primary} />
                          <Text style={[styles.contactPhoneText, { color: isOwn ? "rgba(255,255,255,0.9)" : colors.text }]} numberOfLines={1}>{display}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })()}
          {type === "profile" && (() => {
            const profile = parseJsonSafe(text, {});
            const displayName = profile.displayName ?? profile.display_name ?? "User";
            const avatarUrlProfile = profile.avatarUrl ?? profile.avatar_url;
            const userIdProfile = profile.userId ?? profile.id;
            const accountPrivate = profile.accountPrivate ?? profile.account_private ?? true;
            const phone = profile.phone ?? profile.phone_number ?? "";
            const idStr = profile.id != null ? String(profile.id) : (profile.userId != null ? String(profile.userId) : "");
            const showDetails = !accountPrivate && (idStr || phone);
            return (
              <TouchableOpacity
                style={[styles.profileCard, isOwn && styles.profileCardOwn]}
                onPress={userIdProfile && onProfilePress ? () => onProfilePress({ ...message, userId: userIdProfile }) : undefined}
                activeOpacity={onProfilePress ? 0.8 : 1}
              >
                <View style={styles.profileCardRow}>
                  {avatarUrlProfile ? (
                    <Image source={{ uri: avatarUrlProfile }} style={styles.profileCardAvatar} />
                  ) : (
                    <View style={[styles.profileCardAvatar, styles.profileCardAvatarPlaceholder]}>
                      <Text style={[styles.profileCardAvatarLetter, isOwn && styles.profileCardAvatarLetterOwn]}>{(displayName || "?").charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={[styles.profileCardName, { color: isOwn ? colors.white : colors.text }]} numberOfLines={1}>{displayName}</Text>
                </View>
                {showDetails && (
                  <View style={styles.profileCardDetails}>
                    {idStr ? <Text style={[styles.profileCardDetail, { color: isOwn ? "rgba(255,255,255,0.85)" : colors.textMuted }]}>ID: {idStr}</Text> : null}
                    {phone ? (
                      <Text style={[styles.profileCardDetail, { color: isOwn ? "rgba(255,255,255,0.85)" : colors.textMuted }]} numberOfLines={1}>
                        {phone.trim().startsWith("+") ? phone.trim() : `+${phone.trim()}`}
                      </Text>
                    ) : null}
                  </View>
                )}
              </TouchableOpacity>
            );
          })()}
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
    specialCard: {
      minWidth: 180,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.06)",
      alignItems: "center",
      gap: 4,
    },
    specialCardOwn: {
      backgroundColor: "rgba(255,255,255,0.2)",
    },
    specialCardTitle: { fontSize: 15, fontWeight: "600" },
    specialCardSub: { fontSize: 12 },
    locationMapWrap: { width: "100%", height: 120, borderRadius: 8, overflow: "hidden", marginTop: spacing.sm },
    locationMap: { width: "100%", height: 120, backgroundColor: "rgba(0,0,0,0.05)" },
    contactCard: {
      minWidth: 200,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.06)",
    },
    contactCardOwn: {
      backgroundColor: "rgba(255,255,255,0.2)",
    },
    contactRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
    contactAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(0,0,0,0.08)",
      justifyContent: "center",
      alignItems: "center",
    },
    contactAvatarOwn: { backgroundColor: "rgba(255,255,255,0.25)" },
    contactName: { fontSize: 16, fontWeight: "600", flex: 1 },
    contactPhones: { gap: 4 },
    contactPhoneRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    contactPhoneText: { fontSize: 14 },
    pollCard: {
      minWidth: 220,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.06)",
    },
    pollCardOwn: { backgroundColor: "rgba(255,255,255,0.2)" },
    pollHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    pollQuestion: { flex: 1, fontSize: 15, fontWeight: "600" },
    pollOptionsWrap: { gap: 6 },
    pollOptionRow: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: "rgba(0,0,0,0.05)",
      overflow: "hidden",
      position: "relative",
    },
    pollOptionRowOwn: { backgroundColor: "rgba(255,255,255,0.15)" },
    pollOptionRowLeading: { borderWidth: 1.5, borderColor: "rgba(76,175,80,0.6)" },
    pollOptionRowVoted: { borderWidth: 1, borderColor: "rgba(33,150,243,0.5)" },
    pollOptionBar: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.08)",
      borderRadius: 8,
    },
    pollOptionContent: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", zIndex: 1 },
    pollOptionText: { fontSize: 14, flex: 1 },
    pollOptionPct: { fontSize: 12, marginLeft: 6 },
    pollOptionCheck: { marginLeft: 4 },
    profileCard: {
      minWidth: 220,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.06)",
    },
    profileCardOwn: { backgroundColor: "rgba(255,255,255,0.2)" },
    profileCardRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
    profileCardAvatar: { width: 44, height: 44, borderRadius: 22 },
    profileCardAvatarPlaceholder: {
      backgroundColor: "rgba(0,0,0,0.12)",
      justifyContent: "center",
      alignItems: "center",
    },
    profileCardAvatarLetter: { fontSize: 18, fontWeight: "700", color: "rgba(0,0,0,0.6)" },
    profileCardAvatarLetterOwn: { color: "rgba(255,255,255,0.95)" },
    profileCardName: { flex: 1, fontSize: 16, fontWeight: "600" },
    profileCardDetails: { gap: 2 },
    profileCardDetail: { fontSize: 13 },
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
