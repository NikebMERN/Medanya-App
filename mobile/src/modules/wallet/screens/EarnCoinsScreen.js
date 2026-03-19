/**
 * EarnCoinsScreen — Tasks hub: watch ads, invite, daily check-in, KYC, post video, go live.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../../theme/useThemeColors";
import { radii, layout } from "../../../theme/designSystem";
import { spacing } from "../../../theme/spacing";
import { useWalletStore } from "../wallet.store";
import { useAuthStore } from "../../../store/auth.store";
import FeatureGuard from "../../../components/guards/FeatureGuard";
import * as walletApi from "../wallet.api";
import { useWatchAdEarn } from "../../gifts/hooks/useWatchAdEarn";

const TX_LABELS = { credit: "Recharged", debit: "Spent", earn: "Earned", commission: "Commission" };

export default function EarnCoinsScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { coinBalance, tasksProgress, fetchTasks, fetchWallet } = useWalletStore();
  const user = useAuthStore((s) => s.user);
  const kycVerified = ["verified_auto", "verified_manual", "verified"].includes(user?.kyc_status ?? user?.kycStatus ?? "")
    || !!(user?.kyc_face_verified ?? user?.kycFaceVerified);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(null);

  const { watchAd, adLoading } = useWatchAdEarn({
    onEarned: (amount) => {
      fetchWallet();
      Alert.alert("Earned!", `+${amount} MC`);
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchTasks();
    } finally {
      setLoading(false);
    }
  }, [fetchTasks]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleTaskPress = useCallback(
    async (task) => {
      if (task.id === "watch_ad") {
        await watchAd();
        return;
      }
      if (task.id === "invite") {
        navigation.navigate("Referral");
        return;
      }
      if (task.id === "kyc") {
        if (kycVerified) {
          setClaiming("kyc");
          try {
            const res = await walletApi.claimTask("kyc");
            if (res?.reward) Alert.alert("Earned!", `+${res.reward} MC`);
            await fetchWallet();
            await fetchTasks();
          } catch (e) {
            Alert.alert("Error", e?.response?.data?.error?.message ?? e?.message ?? "Failed");
          } finally {
            setClaiming(null);
          }
        } else {
          navigation.getParent?.()?.navigate?.("Profile", { screen: "ProfileMain" });
        }
        return;
      }
      if (task.id === "post_video" || task.id === "go_live") {
        navigation.getParent?.()?.navigate?.("Create");
        return;
      }
      setClaiming(task.id);
      try {
        const res = await walletApi.claimTask(task.id);
        if (res?.reward) Alert.alert("Earned!", `+${res.reward} MC`);
        await fetchWallet();
        await fetchTasks();
      } catch (e) {
        Alert.alert("Error", e?.response?.data?.error?.message ?? e?.message ?? "Failed");
      } finally {
        setClaiming(null);
      }
    },
    [watchAd, navigation, fetchWallet, fetchTasks, kycVerified]
  );

  const streak = 0;

  if (loading && (!tasksProgress || tasksProgress.length === 0)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const tasks = tasksProgress && tasksProgress.length > 0 ? tasksProgress : [
    { id: "watch_ad", title: "Watch Ads", reward: 12, dailyCap: 15, progress: 0, icon: "play-circle" },
    { id: "invite", title: "Invite Friends", reward: 50, dailyCap: 500, progress: 0, icon: "people" },
    { id: "daily_checkin", title: "Daily Check-in", reward: 10, streak: 0, icon: "calendar-today" },
    { id: "kyc", title: "Complete Profile/KYC", reward: 100, oneTime: true, done: false, icon: "badge" },
    { id: "post_video", title: "Post a Video", reward: 25, done: false, icon: "videocam" },
    { id: "go_live", title: "Go Live", reward: 50, done: false, icon: "live-tv" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earn MedCoins</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.streakCard}>
          <MaterialIcons name="local-fire-department" size={32} color={colors.warning} />
          <View style={styles.streakText}>
            <Text style={styles.streakTitle}>Daily streak</Text>
            <Text style={styles.streakValue}>{streak} days</Text>
          </View>
        </View>

        {tasks.map((task) => {
          const isWatchAd = task.id === "watch_ad";
          const busy = claiming === task.id || (isWatchAd && adLoading);
          const canGo = !task.done && !busy;
          const card = (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => canGo && handleTaskPress(task)}
              disabled={!canGo && !isWatchAd}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={task.icon || "star"}
                size={28}
                color={task.done ? colors.textMuted : colors.primary}
              />
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, task.done && styles.taskDone]}>{task.title}</Text>
                <Text style={styles.taskSub}>
                  {task.dailyCap ? `${task.progress ?? 0}/${task.dailyCap} today` : `+${task.reward} MC`}
                </Text>
              </View>
              {busy ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <TouchableOpacity
                  style={[styles.goBtn, !canGo && styles.goBtnDisabled]}
                  onPress={() => canGo && handleTaskPress(task)}
                  disabled={!canGo}
                >
                  <Text style={styles.goBtnText}>GO</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );

          if (isWatchAd) {
            return (
              <FeatureGuard
                key={task.id}
                featureName="ads"
                mode="block"
                title="Rewards are available on the mobile app"
                message="Watch rewarded ads and earn MedCoins in the mobile app."
                iconName="workspace-premium"
                compact
                variant="card"
              >
                {card}
              </FeatureGuard>
            );
          }

          return card;
        })}

        <Text style={styles.disclaimer}>
          Anti-fraud: Misleading or abusive behavior may result in loss of rewards.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: layout.screenPadding,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    scroll: { flex: 1 },
    scrollContent: { padding: layout.screenPadding, paddingBottom: spacing.xxl },
    streakCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: radii.card,
      padding: layout.cardPadding,
      marginBottom: layout.sectionGap,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
    },
    streakText: {},
    streakTitle: { fontSize: 14, color: colors.textSecondary },
    streakValue: { fontSize: 20, fontWeight: "800", color: colors.text },
    taskCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: radii.card,
      padding: layout.cardPadding,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
    },
    taskContent: { flex: 1 },
    taskTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    taskDone: { color: colors.textMuted, textDecorationLine: "line-through" },
    taskSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    goBtn: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.button,
    },
    goBtnDisabled: { opacity: 0.5 },
    goBtnText: { fontSize: 14, fontWeight: "700", color: colors.white },
    disclaimer: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xl,
      lineHeight: 18,
    },
  });
}
