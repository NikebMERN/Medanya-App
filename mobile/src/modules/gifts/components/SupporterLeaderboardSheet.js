/**
 * SupporterLeaderboardSheet — Top supporters for live stream.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../../theme/useThemeColors";
import { radii } from "../../../theme/designSystem";
import { spacing } from "../../../theme/spacing";
import * as giftsApi from "../gifts.api";

export default function SupporterLeaderboardSheet({
  visible,
  onClose,
  streamId,
}) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors, insets);

  const [supporters, setSupporters] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && streamId) {
      setLoading(true);
      giftsApi
        .getLiveSupporters(streamId)
        .then((s) => setSupporters(Array.isArray(s) ? s : []))
        .catch(() => setSupporters([]))
        .finally(() => setLoading(false));
    }
  }, [visible, streamId]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Top supporters</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={supporters}
              keyExtractor={(item) => String(item.userId ?? item.id ?? item.username ?? Math.random())}
              contentContainerStyle={styles.listContent}
              renderItem={({ item, index }) => (
                <View style={styles.row}>
                  <View style={styles.rank}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(item.displayName ?? item.username ?? "?")[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{item.displayName ?? item.username ?? "Anonymous"}</Text>
                    <Text style={styles.coins}>{item.totalCoins ?? item.coins ?? 0} MC</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <MaterialIcons name="people-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No supporters yet</Text>
                </View>
              }
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors, insets) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: (insets?.bottom || 0) + spacing.lg,
      paddingHorizontal: spacing.lg,
      maxHeight: "60%",
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
    title: { fontSize: 20, fontWeight: "800", color: colors.text },
    center: { padding: spacing.xl, alignItems: "center" },
    listContent: { paddingBottom: spacing.xl },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    rank: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
    },
    rankText: { fontSize: 13, fontWeight: "800", color: colors.primary },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + "40",
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: { fontSize: 16, fontWeight: "700", color: colors.primary },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: "600", color: colors.text },
    coins: { fontSize: 14, color: colors.primary, marginTop: 2 },
    empty: { padding: spacing.xxl, alignItems: "center" },
    emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.md },
  });
}
