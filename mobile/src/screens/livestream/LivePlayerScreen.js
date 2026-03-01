import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/auth.store";
import * as activityApi from "../../services/activity.api";
import { useLivestreamJoinTimer } from "../../hooks/useLivestreamJoinTimer";
import PinItemSheet from "../../components/PinItemSheet";
import GiftPanelBottomSheet from "../../modules/gifts/components/GiftPanelBottomSheet";
import SupporterLeaderboardSheet from "../../modules/gifts/components/SupporterLeaderboardSheet";
import BoostBottomSheet from "../../modules/support/components/BoostBottomSheet";

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
  const userId = useAuthStore((s) => s.user)?.id ?? useAuthStore((s) => s.user)?.userId;
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
    // Socket join stream room and listen for viewer_count_update / stream:viewerCount
    // When stream_stopped, navigate back
    return () => {
      // Socket leave stream room
    };
  }, [streamId]);

  return (
    <View style={styles.container}>
      <View style={styles.videoPlaceholder}>
        <MaterialIcons name="videocam" size={64} color={colors.textMuted} />
        <Text style={styles.placeholderText}>Live stream (Agora/LiveKit)</Text>
        <Text style={styles.meta}>{viewerCount} watching</Text>
      </View>
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
