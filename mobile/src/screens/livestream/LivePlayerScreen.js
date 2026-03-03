import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/auth.store";
import { ensureChatSocket } from "../../realtime/chat.socket";
import {
  joinStream,
  leaveStream,
  onStreamHostAway,
  offStreamHostAway,
  onStreamHostBack,
  offStreamHostBack,
  onStreamViewerCount,
  offStreamViewerCount,
  onLivestreamStop,
  offLivestreamStop,
} from "../../realtime/livestream.socket";
import * as activityApi from "../../services/activity.api";
import { useLivestreamJoinTimer } from "../../hooks/useLivestreamJoinTimer";
import PinItemSheet from "../../components/PinItemSheet";
import GiftPanelBottomSheet from "../../modules/gifts/components/GiftPanelBottomSheet";
import SupporterLeaderboardSheet from "../../modules/gifts/components/SupporterLeaderboardSheet";
import BoostBottomSheet from "../../modules/support/components/BoostBottomSheet";
import * as livestreamApi from "../../api/livestream.api";
import { isAgoraAvailable, useAgoraViewer, AgoraRemoteView } from "../../modules/livestream/AgoraVideoView";

export default function LivePlayerScreen({ route, navigation }) {
  const { streamId, stream: routeStream, isHost } = route?.params ?? {};
  const [stream, setStream] = useState(routeStream);
  const [pinSheetVisible, setPinSheetVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);
  const [viewerCount, setViewerCount] = useState(routeStream?.viewerCount ?? 0);
  const [giftPanelVisible, setGiftPanelVisible] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [boostVisible, setBoostVisible] = useState(false);
  const [hostAway, setHostAway] = useState(false);
  const [agoraToken, setAgoraToken] = useState(null);
  const userId = useAuthStore((s) => s.user)?.id ?? useAuthStore((s) => s.user)?.userId;
  const token = useAuthStore((s) => s.token);
  const useAgora = isAgoraAvailable();
  const hostId = stream?.hostId ?? routeStream?.hostId;
  const isOwnLive = !!(userId && hostId && String(hostId) === String(userId));

  useLivestreamJoinTimer(!!(streamId && userId && !isHost), {
    streamId,
    creatorId: hostId,
  });

  useEffect(() => {
    if (streamId && userId) {
      activityApi.logActivity({ action: "enter_livestream", targetType: "livestream", targetId: String(streamId) });
    }
  }, [streamId, userId]);

  const loadStream = useCallback(async () => {
    if (!streamId) return;
    try {
      const api = await import("../../api/livestream.api");
      const s = await api.getStream(streamId);
      if (s) setStream(s);
    } catch (_) {}
  }, [streamId]);

  useEffect(() => {
    if (streamId && !stream?.field) loadStream();
  }, [streamId, stream?.field, loadStream]);

  useEffect(() => {
    if (!useAgora || !streamId || isHost) return;
    livestreamApi.getStreamToken(streamId).then((t) => setAgoraToken(t)).catch(() => {});
  }, [useAgora, streamId, isHost]);

  const { ready: agoraReady, remoteUid } = useAgoraViewer({
    streamId: useAgora && !isHost ? streamId : null,
    channelName: agoraToken?.providerRoom,
    token: agoraToken?.token,
    uid: agoraToken?.uid,
  });

  useEffect(() => {
    if (!streamId || !token || isHost) return;
    ensureChatSocket(token);
    const onHostAway = (data) => {
      if (data?.streamId === streamId) setHostAway(true);
    };
    const onHostBack = (data) => {
      if (data?.streamId === streamId) setHostAway(false);
    };
    const onViewerCount = (data) => {
      if (data?.streamId === streamId) setViewerCount((c) => data?.viewerCount ?? c);
    };
    const onStop = (data) => {
      if (data?.streamId === streamId) navigation.goBack();
    };
    onStreamHostAway(onHostAway);
    onStreamHostBack(onHostBack);
    onStreamViewerCount(onViewerCount);
    onLivestreamStop(onStop);
    joinStream(streamId, (ack) => {
      if (ack?.ok && ack?.stream?.viewerCount != null) setViewerCount(ack.stream.viewerCount);
    });
    return () => {
      offStreamHostAway(onHostAway);
      offStreamHostBack(onHostBack);
      offStreamViewerCount(onViewerCount);
      offLivestreamStop(onStop);
      leaveStream(streamId);
    };
  }, [streamId, token, isHost, navigation]);

  const renderVideoContent = () => {
    if (hostAway && !isHost) {
      return (
        <View style={styles.waitingOverlay}>
          <MaterialIcons name="hourglass-empty" size={64} color={colors.textMuted} />
          <Text style={styles.waitingTitle}>Host will be right back</Text>
          <Text style={styles.waitingSub}>Please wait while the host returns to the stream</Text>
        </View>
      );
    }
    if (useAgora && agoraToken && !hostAway) {
      if (agoraReady && remoteUid != null) {
        return (
          <AgoraRemoteView
            channelId={agoraToken.providerRoom}
            remoteUid={remoteUid}
            style={StyleSheet.absoluteFill}
          />
        );
      }
      if (agoraReady && remoteUid == null) {
        return (
          <View style={styles.waitingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.waitingTitle}>Waiting for host video…</Text>
          </View>
        );
      }
      return (
        <View style={styles.waitingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.waitingTitle}>Connecting to stream…</Text>
        </View>
      );
    }
    return (
      <>
        <MaterialIcons name="videocam" size={64} color={colors.textMuted} />
        <Text style={styles.placeholderText}>Live stream (install Agora for video)</Text>
        <Text style={styles.meta}>{viewerCount} watching</Text>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.videoPlaceholder}>{renderVideoContent()}</View>
      <View style={[styles.overlay, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.rightActions}>
          {!isHost && (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setGiftPanelVisible(true)}>
                <MaterialIcons name="card-giftcard" size={24} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setLeaderboardVisible(true)}>
                <MaterialIcons name="leaderboard" size={24} color={colors.white} />
              </TouchableOpacity>
              {!isOwnLive && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => setBoostVisible(true)}>
                  <MaterialIcons name="bolt" size={24} color={colors.white} />
                </TouchableOpacity>
              )}
              {(stream?.field === "MARKETING" || routeStream?.field === "MARKETING") && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => setPinSheetVisible(true)}>
                  <MaterialIcons name="storefront" size={24} color={colors.white} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        {isHost && (
          <TouchableOpacity
            style={styles.endBtn}
            onPress={() => {
              // end stream API + socket leave + goBack
              navigation.goBack();
            }}
          >
            <Text style={styles.endBtnText}>End stream</Text>
          </TouchableOpacity>
        )}
      </View>
      <PinItemSheet
        visible={pinSheetVisible}
        onClose={() => setPinSheetVisible(false)}
        streamId={streamId}
        creatorId={stream?.hostId ?? routeStream?.hostId}
        onItemPress={(listItem) => {
          const nav = navigation?.getParent?.()?.getParent?.() ?? navigation;
          nav?.navigate?.("Main", { screen: "Marketplace", params: { screen: "MarketplaceDetail", params: { itemId: listItem.id } } });
        }}
      />
      <GiftPanelBottomSheet
        visible={giftPanelVisible}
        onClose={() => setGiftPanelVisible(false)}
        streamId={streamId}
        creatorId={hostId}
        onGiftSent={() => {}}
        onRecharge={() => navigation?.getParent?.()?.getParent?.()?.navigate?.("Main", { screen: "Profile", params: { screen: "Recharge" } })}
      />
      <SupporterLeaderboardSheet
        visible={leaderboardVisible}
        onClose={() => setLeaderboardVisible(false)}
        streamId={streamId}
      />
      <BoostBottomSheet
        visible={boostVisible}
        onClose={() => setBoostVisible(false)}
        creatorId={hostId}
        creatorName={stream?.hostName ?? routeStream?.hostName}
        context="LIVE"
        contextId={streamId}
        isOwnContent={isOwnLive}
        onRecharge={() => navigation?.getParent?.()?.getParent?.()?.navigate?.("Main", { screen: "Profile", params: { screen: "Recharge" } })}
      />
    </View>
  );
}

function createStyles(colors, insets) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    waitingOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    waitingTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 16 },
    waitingSub: { fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: "center" },
    videoPlaceholder: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    placeholderText: { color: colors.text, fontSize: 16, marginTop: 12 },
    meta: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: spacing.md,
    },
    backBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
    rightActions: { flexDirection: "row", alignItems: "center", gap: 4 },
    actionBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
    endBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: (colors.error || "#e53935") + "cc" },
    endBtnText: { color: colors.white, fontWeight: "700" },
  });
}
