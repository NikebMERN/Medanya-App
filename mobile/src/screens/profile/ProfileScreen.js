import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Pressable,
  useWindowDimensions,
  RefreshControl,
  Animated,
  AppState,
} from "react-native";
import {
  PinchGestureHandler,
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/auth.store";
import { useThemeStore } from "../../store/theme.store";
import { useThemeColors } from "../../theme/useThemeColors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { getMe, getFollowRequests } from "../../api/user.api";
import * as kycApi from "../../api/kyc.api";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const { user: storeUser, logout } = useAuthStore();
  const [user, setUser] = useState(storeUser);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followRequestCount, setFollowRequestCount] = useState(0);
  const [avatarFullScreenVisible, setAvatarFullScreenVisible] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [zoomScale, setZoomScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const baseScaleRef = useRef(1);
  const baseTranslateXRef = useRef(0);
  const baseTranslateYRef = useRef(0);

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;

  const openAvatarFullScreen = () => setAvatarFullScreenVisible(true);
  const closeAvatarFullScreen = () => {
    setAvatarFullScreenVisible(false);
    setZoomScale(1);
    setTranslateX(0);
    setTranslateY(0);
    baseScaleRef.current = 1;
    baseTranslateXRef.current = 0;
    baseTranslateYRef.current = 0;
  };

  const onPinchStateChange = (e) => {
    const { state, scale } = e.nativeEvent;
    if (state === State.BEGAN) baseScaleRef.current = zoomScale;
    if (state === State.END || state === State.CANCELLED) {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, baseScaleRef.current * scale));
      baseScaleRef.current = next;
      setZoomScale(next);
    }
  };
  const onPinchGestureEvent = (e) => {
    const { scale } = e.nativeEvent;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, baseScaleRef.current * scale));
    setZoomScale(next);
  };
  const onPanStateChange = (e) => {
    const { state, translationX, translationY } = e.nativeEvent;
    if (state === State.BEGAN) {
      baseTranslateXRef.current = translateX;
      baseTranslateYRef.current = translateY;
    }
    if (state === State.END || state === State.CANCELLED) {
      setTranslateX(baseTranslateXRef.current + translationX);
      setTranslateY(baseTranslateYRef.current + translationY);
      baseTranslateXRef.current = baseTranslateXRef.current + translationX;
      baseTranslateYRef.current = baseTranslateYRef.current + translationY;
    }
  };
  const onPanGestureEvent = (e) => {
    const { translationX, translationY } = e.nativeEvent;
    setTranslateX(baseTranslateXRef.current + translationX);
    setTranslateY(baseTranslateYRef.current + translationY);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMe();
        if (!cancelled && res?.user) {
          setUser(res.user);
          useAuthStore.getState().updateUser(res.user);
        }
      } catch (_) {
        if (!cancelled) setUser(storeUser);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storeUser?.id]);

  // Sync local user when store updates (e.g. after Edit Profile saves new avatar)
  useEffect(() => {
    if (!storeUser?.id) return;
    setUser((prev) =>
      prev?.id === storeUser?.id ? { ...prev, ...storeUser } : storeUser
    );
  }, [
    storeUser?.avatar_url,
    storeUser?.avatarUrl,
    storeUser?.display_name,
    storeUser?.displayName,
    storeUser?.full_name,
    storeUser?.fullName,
    storeUser?.dob,
    storeUser?.bio,
    storeUser?.neighborhood,
    storeUser?.account_private,
    storeUser?.accountPrivate,
    storeUser?.email,
    storeUser?.kyc_status,
    storeUser?.kycStatus,
  ]);

  const fetchFollowRequestCount = useCallback(async () => {
    const accountPrivate = user?.account_private ?? user?.accountPrivate;
    if (!accountPrivate) return;
    try {
      const res = await getFollowRequests();
      setFollowRequestCount(res?.requests?.length ?? 0);
    } catch (_) {}
  }, [user?.id, user?.account_private, user?.accountPrivate]);

  useEffect(() => {
    fetchFollowRequestCount();
  }, [fetchFollowRequestCount]);

  useFocusEffect(
    useCallback(() => {
      fetchFollowRequestCount();
      // Refresh user to pick up kyc_status (e.g. after Veriff webhook updates)
      const refreshUser = () => {
        getMe()
          .then((res) => {
            if (res?.user) {
              setUser(res.user);
              useAuthStore.getState().updateUser(res.user);
            }
          })
          .catch(() => {});
      };
      refreshUser();
      // If KYC pending, also sync Veriff decision (webhook fallback)
      const kyc = storeUser?.kyc_status ?? storeUser?.kycStatus;
      if (kyc === "pending" || kyc === "PENDING") {
        kycApi.veriffSync().catch(() => {}).then((res) => {
          if (res?.updated && res?.kycStatus) {
            useAuthStore.getState().updateUser({ kyc_status: res.kycStatus, kycStatus: res.kycStatus });
            getMe().then((r) => r?.user && (setUser(r.user), useAuthStore.getState().updateUser(r.user)));
          }
        });
      }
    }, [fetchFollowRequestCount, storeUser?.kyc_status, storeUser?.kycStatus])
  );

  // Refresh KYC status when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && storeUser?.id) {
        getMe().then((res) => res?.user && (setUser(res.user), useAuthStore.getState().updateUser(res.user)));
        const kyc = storeUser?.kyc_status ?? storeUser?.kycStatus;
        if (kyc === "pending" || kyc === "PENDING") {
          kycApi.veriffSync().catch(() => {}).then((res) => {
            if (res?.updated && res?.kycStatus) {
              useAuthStore.getState().updateUser({ kyc_status: res.kycStatus, kycStatus: res.kycStatus });
              getMe().then((r) => r?.user && (setUser(r.user), useAuthStore.getState().updateUser(r.user)));
            }
          });
        }
      }
    });
    return () => sub?.remove?.();
  }, [storeUser?.id, storeUser?.kyc_status, storeUser?.kycStatus]);

  const displayName = user?.display_name ?? user?.displayName ?? "—";
  const neighborhood = user?.neighborhood ?? "—";
  const avatarUrl = user?.avatar_url ?? user?.avatarUrl;
  const bio = user?.bio ?? "";
  const followerCount = user?.followerCount ?? 0;
  const followingCount = user?.followingCount ?? 0;
  const accountPrivate = user?.account_private ?? user?.accountPrivate;
  const hasLegalName = !!String(user?.full_name ?? user?.fullName ?? "").trim();
  const riskBars = user?.risk_score ?? 0;
  const riskLabel = user?.risk_label ?? "risky";
  const riskBreakdown = user?.risk_breakdown ?? { score: 0, label: "risky", items: [] };
  const [riskDropdownVisible, setRiskDropdownVisible] = useState(false);
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: riskBars / 5,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [riskBars, fillAnim]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const openEditProfile = () => {
    navigation.navigate("EditProfile", { user });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await getMe();
      if (res?.user) setUser(res.user);
      await fetchFollowRequestCount();
    } catch (_) {}
    setRefreshing(false);
  }, [fetchFollowRequestCount]);

  useEffect(() => {
    if (route.params?.refresh != null) onRefresh();
  }, [route.params?.refresh, onRefresh]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Risk/Safety score - cool filling bar (tappable for checklist) */}
      <TouchableOpacity
        style={styles.riskCard}
        onPress={() => setRiskDropdownVisible((v) => !v)}
        activeOpacity={1}
      >
        <View style={styles.riskHeader}>
          <MaterialIcons
            name={riskLabel === "safe" ? "shield" : riskLabel === "half-safe" ? "security" : "warning"}
            size={18}
            color={riskLabel === "safe" ? colors.primary : riskLabel === "half-safe" ? colors.warning : colors.error}
          />
          <Text style={[styles.riskLabel, { color: riskLabel === "safe" ? colors.primary : riskLabel === "half-safe" ? colors.warning : colors.error }]}>
            {riskLabel === "safe" ? "SAFE" : riskLabel === "half-safe" ? "HALF SAFE" : "RISKY"}
          </Text>
          <View style={styles.riskHeaderRight}>
            <Text style={[styles.riskBarsText, { color: colors.textMuted }]}>
              {riskBars}/5
            </Text>
            <MaterialIcons
              name={riskDropdownVisible ? "expand-less" : "expand-more"}
              size={22}
              color={colors.textMuted}
            />
          </View>
        </View>
        <View style={[styles.barTrack, { backgroundColor: colors.surfaceLight }]}>
          <Animated.View
            style={[
              styles.barFill,
              {
                width: fillWidth,
                backgroundColor: riskLabel === "safe" ? colors.primary : riskLabel === "half-safe" ? (colors.warning || "#f59e0b") : (colors.error || "#e53935"),
              },
            ]}
          />
        </View>

        {riskDropdownVisible && (
          <View style={styles.riskDropdown}>
            <Text style={[styles.riskDropdownTitle, { color: colors.text }]}>
              Your safety score — {riskBars}/5
            </Text>
            {riskBars < 5 && (riskBreakdown?.daysToFullVerify ?? 0) > 0 ? (
              <Text style={[styles.riskDropdownDaysLeft, { color: colors.primary }]}>
                {riskBreakdown.daysToFullVerify} days left to fully verify (5/5)
              </Text>
            ) : null}
            <Text style={[styles.riskDropdownSubtitle, { color: colors.textMuted }]}>
              {riskBars >= 5 ? "You've maxed out your safety score!" : "Complete these to reach 5/5:"}
            </Text>
            {riskBreakdown.items?.map((item) => (
              <View key={item.id} style={[styles.riskCheckItem, { borderColor: colors.border }]}>
                <MaterialIcons
                  name={item.met ? "check-circle" : "radio-button-unchecked"}
                  size={22}
                  color={item.met ? colors.success : colors.textMuted}
                  style={styles.riskCheckIcon}
                />
                <View style={styles.riskCheckContent}>
                  <View style={styles.riskCheckLabelRow}>
                    <Text style={[styles.riskCheckLabel, { color: colors.text }]}>{item.label}</Text>
                    {!item.met && (item.daysLeft ?? 0) > 0 ? (
                      <Text style={[styles.riskCheckDaysLeft, { color: colors.primary }]}>
                        {item.daysLeft} days left
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.riskCheckTip, { color: colors.textMuted }]}>
                    {item.met ? item.tip : item.action}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>

      {/* Profile header card - gradient style */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => avatarUrl && openAvatarFullScreen()}
            activeOpacity={avatarUrl ? 0.9 : 1}
            disabled={!avatarUrl}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} key={avatarUrl} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>
                  {(displayName !== "—" ? displayName : "YOUR PROFILE").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <MaterialIcons name="camera-alt" size={16} color={colors.white} />
            </View>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <View style={styles.editLockRow}>
              <View style={[styles.lockIconWrap, { backgroundColor: hasLegalName ? (colors.textMuted || "#888") : colors.surface }]}>
                <MaterialIcons
                  name={hasLegalName ? "lock" : "lock-open"}
                  size={16}
                  color={hasLegalName ? colors.white : colors.textMuted}
                />
              </View>
              <TouchableOpacity style={styles.editBtn} onPress={openEditProfile} activeOpacity={0.8}>
                <MaterialIcons name="edit" size={14} color={colors.white} />
                <Text style={styles.editLabel}>Edit</Text>
              </TouchableOpacity>
            </View>
            {accountPrivate && followRequestCount > 0 && (
              <TouchableOpacity
                style={styles.followRequestsBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("FollowRequests")}
              >
                <MaterialIcons name="person-add" size={14} color={colors.white} />
                <Text style={styles.followRequestsLabel}>{followRequestCount} REQUEST{followRequestCount !== 1 ? "S" : ""}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        <View style={styles.idPhoneRow}>
          {(user?.id ?? user?.userId) ? (
            <Text style={styles.phoneText}>ID: {String(user?.id ?? user?.userId)}</Text>
          ) : null}
          {(user?.phone_number ?? user?.phoneNumber) ? (
            <Text style={styles.phoneText}>
              {String(user.phone_number ?? user.phoneNumber).trim().startsWith("+")
                ? (user.phone_number ?? user.phoneNumber)
                : `+${user.phone_number ?? user.phoneNumber}`}
            </Text>
          ) : null}
        </View>
        {neighborhood !== "—" && (
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText}>{neighborhood.toUpperCase()}</Text>
          </View>
        )}
        {bio ? <Text style={styles.bioUnderPhoto}>{bio}</Text> : null}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate("FollowersList", { userId: user?.id ?? user?.userId })}
          activeOpacity={0.8}
        >
          <MaterialIcons name="people" size={20} color={colors.textSecondary} style={styles.statIcon} />
          <Text style={styles.statNumber}>{followerCount}</Text>
          <Text style={styles.statLabel}>FOLLOWERS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate("FollowingList", { userId: user?.id ?? user?.userId })}
          activeOpacity={0.8}
        >
          <MaterialIcons name="person-add" size={20} color={colors.textSecondary} style={styles.statIcon} />
          <Text style={styles.statNumber}>{followingCount}</Text>
          <Text style={styles.statLabel}>FOLLOWING</Text>
        </TouchableOpacity>
        <View style={styles.statCard}>
          <MaterialIcons name="favorite" size={20} color={colors.error} style={styles.statIcon} />
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>LIKES</Text>
        </View>
      </View>

      {/* Identity verification – hidden when verified */}
      {!["verified", "verified_auto", "verified_manual"].includes(user?.kyc_status ?? user?.kycStatus ?? "none") && (
        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardKyc]}
          onPress={async () => {
            try {
              const data = await kycApi.getKycStatus();
              const kycStatus = data?.kycStatus ?? data?.kyc_status ?? "none";
              if (["verified", "verified_auto", "verified_manual"].includes(kycStatus)) {
                navigation.navigate("VerifyIdentity", { mode: "verified" });
              } else if (kycStatus === "pending") {
                navigation.navigate("VerifyIdentity", { mode: "waiting" });
              } else {
                navigation.navigate("Kyc");
              }
            } catch (_) {
              navigation.navigate("Kyc");
            }
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons name="badge" size={28} color={colors.primary} style={styles.actionIcon} />
          <Text style={styles.actionLabel}>IDENTITY VERIFICATION</Text>
        </TouchableOpacity>
      )}

      {/* Insights */}
      <TouchableOpacity
        style={[styles.actionCard, styles.actionCardKyc]}
        onPress={() => navigation.navigate("Insights")}
        activeOpacity={0.8}
      >
        <MaterialIcons name="insights" size={28} color={colors.primary} style={styles.actionIcon} />
        <Text style={styles.actionLabel}>INSIGHTS</Text>
      </TouchableOpacity>

      {/* Wallet */}
      <TouchableOpacity
        style={[styles.actionCard, styles.actionCardKyc]}
        onPress={() => navigation.navigate("Wallet")}
        activeOpacity={0.8}
      >
        <MaterialIcons name="account-balance-wallet" size={28} color={colors.primary} style={styles.actionIcon} />
        <Text style={styles.actionLabel}>WALLET</Text>
      </TouchableOpacity>

      {/* Earnings / Payouts (seller bank setup) */}
      <TouchableOpacity
        style={[styles.actionCard, styles.actionCardKyc]}
        onPress={() => navigation.navigate("PayoutSetup")}
        activeOpacity={0.8}
      >
        <MaterialIcons name="account-balance" size={28} color={colors.primary} style={styles.actionIcon} />
        <Text style={styles.actionLabel}>EARNINGS / PAYOUTS</Text>
      </TouchableOpacity>

      {/* Light mode + Logout */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionCard} onPress={toggleTheme} activeOpacity={0.8}>
          <MaterialIcons name={theme === "dark" ? "light-mode" : "dark-mode"} size={28} color={colors.text} style={styles.actionIcon} />
          <Text style={styles.actionLabel}>{theme === "dark" ? "LIGHT MODE" : "DARK MODE"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={async () => { try { await logout(); } catch (_) {} }} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={24} color={colors.error} style={styles.actionIconLogout} />
          <Text style={styles.actionLabel}>SECURE LOGOUT</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer} />
    </ScrollView>

    <Modal
      visible={avatarFullScreenVisible}
      transparent
      animationType="fade"
      onRequestClose={closeAvatarFullScreen}
    >
      <Pressable
        style={[styles.avatarFullScreenOverlay, { width: windowWidth, height: windowHeight }]}
        onPress={closeAvatarFullScreen}
      >
        <PinchGestureHandler
          onGestureEvent={onPinchGestureEvent}
          onHandlerStateChange={onPinchStateChange}
        >
          <View style={styles.avatarFullScreenContent}>
            <PanGestureHandler
              onGestureEvent={onPanGestureEvent}
              onHandlerStateChange={onPanStateChange}
              minPointers={1}
            >
              <View
                style={[
                  styles.avatarFullScreenImageWrap,
                  {
                    transform: [
                      { scale: zoomScale },
                      { translateX },
                      { translateY },
                    ],
                  },
                ]}
              >
                <Image
                  source={{ uri: avatarUrl }}
                  style={[
                    styles.avatarFullScreenImage,
                    { width: windowWidth, height: windowWidth, maxHeight: windowHeight },
                  ]}
                  resizeMode="contain"
                />
              </View>
            </PanGestureHandler>
          </View>
        </PinchGestureHandler>

        <TouchableOpacity
          style={styles.avatarFullScreenClose}
          onPress={closeAvatarFullScreen}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <MaterialIcons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
      </Pressable>
    </Modal>
    </>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
    riskCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    riskHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: spacing.sm,
    },
    riskLabel: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.5,
      fontStyle: typography.fontStyle,
    },
    barTrack: {
      height: 10,
      borderRadius: 5,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: 5,
    },
    riskHeaderRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    riskBarsText: {
      fontSize: 12,
      fontWeight: "700",
      fontStyle: typography.fontStyle,
    },
    riskDropdown: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    riskDropdownTitle: {
      fontSize: 15,
      fontWeight: "800",
      marginBottom: 4,
      fontStyle: typography.fontStyle,
    },
    riskDropdownSubtitle: {
      fontSize: 13,
      marginBottom: spacing.md,
      fontStyle: typography.fontStyle,
    },
    riskDropdownDaysLeft: {
      fontSize: 14,
      fontWeight: "700",
      marginBottom: spacing.sm,
      fontStyle: typography.fontStyle,
    },
    riskCheckItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
    },
    riskCheckIcon: {
      marginRight: spacing.sm,
      marginTop: 2,
    },
    riskCheckContent: {
      flex: 1,
    },
    riskCheckLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    riskCheckLabel: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 2,
      fontStyle: typography.fontStyle,
    },
    riskCheckDaysLeft: {
      fontSize: 12,
      fontWeight: "700",
      fontStyle: typography.fontStyle,
    },
    riskCheckTip: {
      fontSize: 12,
      lineHeight: 18,
      fontStyle: typography.fontStyle,
    },
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
    headerCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary + "40",
      padding: spacing.lg,
      marginBottom: spacing.lg,
      overflow: "hidden",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    avatarWrap: {
      position: "relative",
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
    },
    avatarPlaceholder: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarLetter: {
      fontSize: 32,
      fontWeight: "800",
      color: colors.white,
    },
    cameraBadge: {
      position: "absolute",
      right: -4,
      bottom: -4,
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    cameraIcon: { fontSize: 16 },
    headerActions: {
      flexDirection: "column",
      alignItems: "flex-end",
      gap: spacing.sm,
    },
    editLockRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    lockIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    editBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    editLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.white,
      fontStyle: typography.fontStyle,
    },
    displayName: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.xs,
      letterSpacing: 0.3,
      fontStyle: typography.fontStyle,
    },
    idPhoneRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    phoneText: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: typography.fontStyle,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: spacing.sm,
    },
    locationText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      letterSpacing: 0.5,
      fontStyle: typography.fontStyle,
    },
    bioUnderPhoto: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
      opacity: 0.95,
      marginBottom: spacing.md,
      fontStyle: typography.fontStyle,
    },
    followRequestsBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    followRequestsLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.white,
      letterSpacing: 0.5,
      fontStyle: typography.fontStyle,
    },
    statsRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      alignItems: "center",
    },
    statIcon: { marginBottom: 4 },
    statNumber: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 2,
      fontStyle: typography.fontStyle,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textSecondary,
      letterSpacing: 0.5,
      fontStyle: typography.fontStyle,
    },
    actionRow: {
      flexDirection: "row",
      gap: spacing.md,
    },
    actionCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      alignItems: "center",
    },
    actionCardKyc: {
      marginBottom: spacing.md,
    },
    actionIcon: { marginBottom: spacing.sm },
    actionIconLogout: {
      marginBottom: spacing.sm,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: 0.5,
      fontStyle: typography.fontStyle,
    },
    footer: { height: spacing.xxl },
    avatarFullScreenOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
      alignItems: "center",
    },
    avatarFullScreenContent: {
      justifyContent: "center",
      alignItems: "center",
    },
    avatarFullScreenImageWrap: {
      justifyContent: "center",
      alignItems: "center",
    },
    avatarFullScreenImage: {
      backgroundColor: "transparent",
    },
    avatarFullScreenClose: {
      position: "absolute",
      top: 52,
      right: spacing.md,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(255,255,255,0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
  });
}
