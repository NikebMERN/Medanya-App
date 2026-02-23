import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/auth.store";
import * as activityApi from "../../services/activity.api";

export default function LivePlayerScreen({ route, navigation }) {
  const { streamId, stream: routeStream, isHost } = route?.params ?? {};
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);
  const [viewerCount, setViewerCount] = useState(routeStream?.viewerCount ?? 0);
  const userId = useAuthStore((s) => s.user)?.id ?? useAuthStore((s) => s.user)?.userId;

  useEffect(() => {
    if (streamId && userId) {
      activityApi.logActivity({ action: "enter_livestream", targetType: "livestream", targetId: String(streamId) });
    }
  }, [streamId, userId]);

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
    endBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: (colors.error || "#e53935") + "cc" },
    endBtnText: { color: colors.white, fontWeight: "700" },
  });
}
