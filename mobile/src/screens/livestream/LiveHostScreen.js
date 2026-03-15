/**
 * LiveHostScreen — Broadcast: Agora video (or expo-camera fallback when Agora not installed), LIVE badge, viewer count, end, flip, mute, chat overlay.
 */
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useLivestreamStore } from "../../store/livestream.store";
import { useAuthStore } from "../../store/auth.store";
import { ensureChatSocket } from "../../realtime/chat.socket";
import { joinStream, leaveStream, onStreamViewerCount, offStreamViewerCount } from "../../realtime/livestream.socket";
import * as livestreamApi from "../../api/livestream.api";
import { isAgoraAvailable, useAgoraHost, AgoraLocalView } from "../../modules/livestream/AgoraVideoView";

export default function LiveHostScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  const streamId = route.params?.streamId ?? route.params?.stream?._id;
  const [viewerCount, setViewerCount] = useState(route.params?.stream?.viewerCount ?? 0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [muted, setMuted] = useState(false);
  const [ending, setEnding] = useState(false);
  const [facing, setFacing] = useState("front");

  const [permission, requestPermission] = useCameraPermissions();
  const endStream = useLivestreamStore((s) => s.endStream);
  const token = useAuthStore((s) => s.token);
  const [agoraToken, setAgoraToken] = useState(null);
  const [agoraUnavailable, setAgoraUnavailable] = useState(false);
  const useAgora = isAgoraAvailable() && !agoraUnavailable;

  useEffect(() => {
    if (!useAgora || !streamId) return;
    livestreamApi.getStreamToken(streamId).then((t) => setAgoraToken(t)).catch(() => {});
  }, [useAgora, streamId]);

  const { ready: agoraReady, switchCamera: agoraSwitchCamera, setMute: agoraSetMute } = useAgoraHost({
    streamId: useAgora ? streamId : null,
    channelName: agoraToken?.providerRoom,
    token: agoraToken?.token,
    uid: agoraToken?.uid,
    onUnavailable: () => setAgoraUnavailable(true),
  });

  useEffect(() => {
    if (useAgora && agoraReady) agoraSetMute(muted);
  }, [muted, useAgora, agoraReady, agoraSetMute]);

  useEffect(() => {
    if (!streamId || !token) return;
    ensureChatSocket(token);
    const handleViewerCount = (data) => {
      if (data?.streamId === streamId) setViewerCount((c) => data?.viewerCount ?? c);
    };
    onStreamViewerCount(handleViewerCount);
    joinStream(streamId, (ack) => {
      if (ack?.ok && ack?.stream?.viewerCount != null) setViewerCount(ack.stream.viewerCount);
    });
    return () => {
      offStreamViewerCount(handleViewerCount);
      leaveStream(streamId);
    };
  }, [streamId, token]);

  const handleEndStream = useCallback(async () => {
    if (!streamId) {
      navigation.goBack();
      return;
    }
    setEnding(true);
    try {
      await endStream(streamId);
      navigation.getParent()?.goBack?.() || navigation.navigate("Main");
    } catch (e) {
      navigation.goBack();
    } finally {
      setEnding(false);
    }
  }, [streamId, endStream, navigation]);

  const sendChat = useCallback(() => {
    const t = chatInput.trim();
    if (!t) return;
    setChatMessages((prev) => [...prev, { id: Date.now(), text: t, self: true }]);
    setChatInput("");
  }, [chatInput]);

  if (!permission?.granted) {
    return (
      <View style={[styles.container, styles.placeholderCenter]}>
        <Text style={styles.previewText}>Camera permission required for live</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderVideo = () => {
    if (useAgora && agoraToken && agoraReady) {
      return <AgoraLocalView channelId={agoraToken.providerRoom} style={StyleSheet.absoluteFill} />;
    }
    if (useAgora && agoraToken && !agoraReady) {
      return (
        <View style={[styles.container, styles.placeholderCenter]}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.previewText}>Connecting to stream…</Text>
        </View>
      );
    }
    return <CameraView style={StyleSheet.absoluteFill} facing={facing} mode="video" />;
  };

  return (
    <View style={styles.container}>
      {renderVideo()}

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
          <Text style={styles.viewerText}>{viewerCount} watching</Text>
        </View>
        <TouchableOpacity
          style={[styles.endBtn, ending && styles.endBtnDisabled]}
          onPress={handleEndStream}
          disabled={ending}
        >
          {ending ? (
            <Text style={styles.endBtnText}>Ending…</Text>
          ) : (
            <Text style={styles.endBtnText}>End</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.rightToolbar, { top: insets.top + 56 }]}>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => (useAgora && agoraReady ? agoraSwitchCamera() : setFacing((f) => (f === "back" ? "front" : "back")))}
        >
          <MaterialIcons name="flip-camera-ios" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={() => setMuted((m) => !m)}>
          <MaterialIcons name={muted ? "mic-off" : "mic"} size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn}>
          <MaterialIcons name="settings" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={[styles.chatOverlay, { bottom: insets.bottom + spacing.sm }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
          keyboardShouldPersistTaps="handled"
        >
          {chatMessages.length === 0 ? (
            <Text style={styles.chatEmpty}>Live chat messages appear here</Text>
          ) : (
            chatMessages.map((m) => (
              <View key={m.id} style={[styles.chatBubble, m.self && styles.chatBubbleSelf]}>
                <Text style={styles.chatBubbleText} numberOfLines={2}>{m.text}</Text>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Say something..."
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={sendChat}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendChat}>
            <MaterialIcons name="send" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.chatActions}>
          <TouchableOpacity style={styles.chatActionBtn} disabled>
            <MaterialIcons name="card-giftcard" size={22} color={colors.textMuted} />
            <Text style={styles.chatActionLabel}>Gift</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatActionBtn} disabled>
            <MaterialIcons name="share" size={22} color={colors.textMuted} />
            <Text style={styles.chatActionLabel}>Share</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(colors, insets) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    placeholderCenter: {
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xl,
    },
    previewText: { fontSize: 16, color: "#fff", marginBottom: spacing.md },
    permBtn: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      backgroundColor: colors.primary || "#3b82f6",
      borderRadius: 12,
    },
    permBtnText: { color: "#fff", fontWeight: "700" },
    topBar: {
      position: "absolute",
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
    },
    liveBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error || "#ef4444" },
    liveText: { fontSize: 14, fontWeight: "800", color: colors.error || "#ef4444", letterSpacing: 0.5 },
    viewerText: { fontSize: 13, color: "rgba(255,255,255,0.9)" },
    endBtn: {
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: (colors.error || "#ef4444") + "dd",
    },
    endBtnDisabled: { opacity: 0.7 },
    endBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    rightToolbar: {
      position: "absolute",
      right: spacing.sm,
      alignItems: "center",
      gap: spacing.lg,
    },
    toolBtn: { width: 48, height: 48, justifyContent: "center", alignItems: "center" },
    chatOverlay: {
      position: "absolute",
      left: spacing.sm,
      right: spacing.sm,
      maxHeight: 200,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: 12,
      padding: spacing.sm,
    },
    chatList: { maxHeight: 120 },
    chatListContent: { paddingVertical: spacing.xs },
    chatEmpty: { fontSize: 13, color: colors.textMuted, paddingVertical: spacing.sm },
    chatBubble: { alignSelf: "flex-start", maxWidth: "85%", paddingVertical: 4, paddingHorizontal: 8, marginBottom: 4 },
    chatBubbleSelf: { alignSelf: "flex-end" },
    chatBubbleText: { fontSize: 13, color: "#fff" },
    chatInputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
    chatInput: {
      flex: 1,
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: spacing.md,
      fontSize: 14,
      color: "#fff",
    },
    sendBtn: { padding: spacing.xs },
    chatActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
    chatActionBtn: { alignItems: "center" },
    chatActionLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  });
}
