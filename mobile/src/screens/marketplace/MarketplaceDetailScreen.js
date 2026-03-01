import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  FlatList,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import * as marketplaceApi from "../../services/marketplace.api";
import * as chatApi from "../../services/chat.api";
import * as activityApi from "../../services/activity.api";
import { trackEvent } from "../../utils/trackEvent";
import * as userApi from "../../api/user.api";
import SafetyWarningModal from "../../components/SafetyWarningModal";
import ReportOptionsModal from "../../components/common/ReportOptionsModal";
import ContentReportModal from "../../components/ContentReportModal";
import RiskBadge from "../../components/RiskBadge";
import TrustBadge from "../../components/TrustBadge";
import { useFavoritesStore } from "../../store/favorites.store";
import SubScreenHeader from "../../components/SubScreenHeader";

export default function MarketplaceDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? user?.userId ?? "";

  const itemId = route.params?.itemId;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatting, setChatting] = useState(false);
  const [calling, setCalling] = useState(false);
  const [safetyModal, setSafetyModal] = useState({ visible: false, action: null });
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [contentReportVisible, setContentReportVisible] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const imageViewerScrollRef = useRef(null);

  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFavorite = useFavoritesStore((s) => (s.favoriteIds || []).includes(String(itemId)));
  const setSnippet = useFavoritesStore((s) => s.setSnippet);
  const hydrateFavorites = useFavoritesStore((s) => s.hydrate);

  useEffect(() => {
    if (!useFavoritesStore.getState().hydrated) hydrateFavorites();
  }, [hydrateFavorites]);

  const load = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await marketplaceApi.getItem(itemId);
      setItem(data ?? null);
    } catch (err) {
      setError(err?.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (item && userId) {
      activityApi.logActivity({
        action: "view_marketplace",
        targetType: "marketplace",
        targetId: String(itemId),
      });
      trackEvent("market_view", "market_item", itemId);
    }
  }, [item, itemId, userId]);

  useEffect(() => {
    if (item && itemId) {
      const img = Array.isArray(item.image_urls) && item.image_urls[0] ? item.image_urls[0] : item.image_url;
      setSnippet(itemId, {
        title: item.title,
        price: item.price != null ? `${item.currency || "AED"} ${item.price}` : "",
        imageUrl: img || "",
        location: item.location || "",
      });
    }
  }, [item, itemId, setSnippet]);

  const doChatWithSeller = useCallback(async () => {
    const sellerId = item?.seller_id ?? item?.sellerId;
    if (!sellerId) return;
    setChatting(true);
    try {
      const data = await chatApi.startDirect(sellerId);
      const chat = data?.chat ?? data;
      const chatId = chat?._id ?? chat?.id;
      if (chatId) {
        navigation.navigate("Chat", { screen: "ChatRoom", params: { chatId } });
      } else {
        Alert.alert("Error", "Could not start chat.");
      }
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not start chat.");
    } finally {
      setChatting(false);
    }
  }, [item, navigation]);

  const handleChatWithSeller = useCallback(() => {
    const sellerId = item?.seller_id ?? item?.sellerId;
    if (!sellerId) {
      Alert.alert("Error", "Seller information not available.");
      return;
    }
    if (String(sellerId) === String(userId)) {
      Alert.alert("Notice", "This is your own listing.");
      return;
    }
    setSafetyModal({ visible: true, action: "chat" });
  }, [item, userId]);

  const doCallSeller = useCallback(() => {
    setCalling(true);
    const phone = item?.seller_phone ?? item?.sellerPhone ?? item?.contact_phone ?? item?.contactPhone ?? "";
    if (!phone) {
      Alert.alert("Notice", "No contact number available.");
      return;
    }
    const tel = phone.trim().startsWith("+") ? phone.trim() : `+${phone.trim()}`;
    Linking.openURL(`tel:${tel}`).catch(() => Alert.alert("Error", "Could not open dialer."));
    setCalling(false);
  }, [item]);

  const handleCallSeller = useCallback(() => {
    const phone = item?.seller_phone ?? item?.sellerPhone ?? item?.contact_phone ?? item?.contactPhone ?? "";
    if (!phone) {
      Alert.alert("Notice", "No contact number available.");
      return;
    }
    setSafetyModal({ visible: true, action: "call" });
  }, [item]);

  const onSafetyAcknowledge = useCallback(() => {
    setSafetyModal((prev) => {
      if (prev.action === "chat") doChatWithSeller();
      else if (prev.action === "call") doCallSeller();
      return { visible: false, action: null };
    });
  }, [doChatWithSeller, doCallSeller]);

  const handleBlockSeller = useCallback(() => {
    const sid = item?.seller_id ?? item?.sellerId;
    if (!sid) return;
    Alert.alert(
      "Block user",
      "Block this user? You won't see their listings or messages.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            setBlocking(true);
            try {
              await userApi.blockUser(sid);
              Alert.alert("Blocked", "User has been blocked.");
              navigation.goBack();
            } catch (e) {
              Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Failed");
            } finally {
              setBlocking(false);
            }
          },
        },
      ]
    );
  }, [item, navigation]);

  if (loading && !item) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Not found"}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.retryText}>Go back</Text></TouchableOpacity>
      </View>
    );
  }

  const images = Array.isArray(item.image_urls) && item.image_urls.length > 0 ? item.image_urls : item.image_url ? [item.image_url] : [];
  const isSold = (item.status || "").toLowerCase() === "sold";
  const sellerId = item.seller_id ?? item.sellerId;
  const isOwn = String(sellerId) === String(userId);
  const priceCurrency = item.currency || "AED";
  const status = (item.status || "active").toLowerCase();
  const isPendingReview = status === "pending_review" && isOwn;
  const riskScore = item.risk_score ?? item.riskScore ?? 0;
  const showRiskWarning = riskScore >= 60;
  const sellerTrustScore = item.seller_trust_score ?? item.sellerTrustScore;
  const hasPhone = !!(item?.seller_phone ?? item?.sellerPhone ?? item?.contact_phone ?? item?.contactPhone);

  const tabNav = navigation.getParent?.() ?? navigation;
  const rightEl = (
    <>
      <TouchableOpacity
        style={styles.moreBtn}
        onPress={() => toggleFavorite(itemId, {
          title: item.title,
          price: item.price != null ? `${priceCurrency} ${item.price}` : "",
          imageUrl: images[0] || "",
          location: item.location || "",
        })}
      >
        <MaterialIcons name={isFavorite ? "favorite" : "favorite-border"} size={24} color={isFavorite ? (colors.error || "#e53935") : colors.text} />
      </TouchableOpacity>
      {!isOwn && (
        <TouchableOpacity style={styles.moreBtn} onPress={() => setReportModalVisible(true)}>
          <MaterialIcons name="more-vert" size={24} color={colors.text} />
        </TouchableOpacity>
      )}
    </>
  );
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubScreenHeader
        title="Item"
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={tabNav}
        rightElement={rightEl}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {images.length > 0 ? (
          <TouchableOpacity activeOpacity={1} onPress={() => { setImageViewerIndex(0); setImageViewerVisible(true); }}>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item: uri }) => (
                <Image source={{ uri }} style={styles.hero} resizeMode="cover" />
              )}
              style={styles.heroScroll}
            />
            {images.length > 1 && (
              <View style={styles.carouselDots}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, styles.dotInactive]} />
                ))}
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]}>
            <MaterialIcons name="image-not-supported" size={56} color={colors.textMuted} />
          </View>
        )}
        <Modal visible={imageViewerVisible} transparent animationType="fade">
          <Pressable style={styles.imageViewerOverlay} onPress={() => setImageViewerVisible(false)}>
            <ScrollView
              ref={imageViewerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.imageViewerScroll}
              contentContainerStyle={styles.imageViewerContent}
            >
              {images.map((uri, i) => (
                <View key={i} style={styles.imageViewerItem}>
                  <Image source={{ uri }} style={styles.imageViewerImage} resizeMode="contain" />
                </View>
              ))}
            </ScrollView>
            <Text style={styles.imageViewerClose}>Tap to close</Text>
          </Pressable>
        </Modal>
        {isSold ? (
          <View style={styles.soldBanner}>
            <Text style={styles.soldBannerText}>SOLD</Text>
          </View>
        ) : null}
        {isPendingReview ? (
          <View style={[styles.pendingBanner, { backgroundColor: colors.warning + "25", borderColor: colors.warning + "60" }]}>
            <MaterialIcons name="schedule" size={20} color={colors.warning} />
            <Text style={[styles.pendingBannerText, { color: colors.text }]}>Pending safety review</Text>
          </View>
        ) : null}
        {showRiskWarning && !isOwn ? (
          <View style={[styles.riskBanner, { backgroundColor: colors.error + "20", borderColor: colors.error + "50" }]}>
            <RiskBadge riskScore={riskScore} aiScamScore={item.ai_scam_score ?? item.aiScamScore} />
            <Text style={[styles.riskBannerText, { color: colors.text }]}>This listing has been flagged. Proceed with caution.</Text>
          </View>
        ) : null}
        <View style={styles.body}>
          <View style={styles.badges}>
            {(item.seller_otp_verified || item.seller_kyc_verified) && (
              <>
                {item.seller_otp_verified && (
                  <View style={styles.badge}><MaterialIcons name="verified-user" size={14} color={colors.primary} /><Text style={styles.badgeText}>Verified Phone</Text></View>
                )}
                {item.seller_kyc_verified && (
                  <View style={styles.badge}><MaterialIcons name="badge" size={14} color={colors.success} /><Text style={styles.badgeText}>Verified Identity</Text></View>
                )}
              </>
            )}
            {(item.reports_count || 0) >= 1 && (
              <View style={[styles.badge, styles.badgeReported]}><MaterialIcons name="warning" size={14} color={colors.warning} /><Text style={styles.badgeText}>Reported</Text></View>
            )}
            {item.status === "PENDING_REVIEW" && (
              <View style={[styles.badge, styles.badgePending]}><Text style={styles.badgeText}>Pending Review</Text></View>
            )}
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.price}>{priceCurrency} {item.price != null ? item.price : "—"}</Text>
          {item.category ? <Text style={styles.meta}>Category: {item.category}</Text> : null}
          {item.location ? (
            <View style={styles.row}>
              <MaterialIcons name="location-on" size={20} color={colors.textSecondary} />
              <Text style={styles.rowText}>{item.location}</Text>
            </View>
          ) : null}
          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

          {!isSold && !isOwn && sellerId ? (
            <>
              <TouchableOpacity
                style={[styles.buyBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate("Checkout", { itemId, item })}
              >
                <MaterialIcons name="shopping-cart" size={22} color={colors.white} />
                <Text style={styles.buyBtnText}>Buy</Text>
              </TouchableOpacity>
              <View style={styles.sellerSection}>
                <Text style={styles.sellerLabel}>Seller</Text>
                <View style={styles.sellerRow}>
                  {sellerTrustScore != null && (
                    <TrustBadge trustScore={sellerTrustScore} />
                  )}
                  {(item.seller_otp_verified || item.seller_kyc_verified) && (
                    <View style={styles.sellerVerified}>
                      {item.seller_otp_verified && (
                        <View style={styles.badge}><MaterialIcons name="verified-user" size={14} color={colors.primary} /><Text style={styles.badgeText}>Verified Phone</Text></View>
                      )}
                      {item.seller_kyc_verified && (
                        <View style={styles.badge}><MaterialIcons name="badge" size={14} color={colors.success} /><Text style={styles.badgeText}>Verified Identity</Text></View>
                      )}
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.chatBtn, chatting && styles.chatBtnDisabled]}
                  onPress={handleChatWithSeller}
                  disabled={chatting}
                >
                  {chatting ? <ActivityIndicator size="small" color={colors.white} /> : <><MaterialIcons name="chat" size={22} color={colors.white} /><Text style={styles.chatBtnText}>Chat</Text></>}
                </TouchableOpacity>
                {hasPhone && (
                  <TouchableOpacity
                    style={[styles.callBtn, { borderColor: colors.primary }]}
                    onPress={handleCallSeller}
                    disabled={calling}
                  >
                    <MaterialIcons name="call" size={22} color={colors.primary} />
                    <Text style={[styles.callBtnText, { color: colors.primary }]}>Call</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.reportRow}>
                <TouchableOpacity style={styles.reportBtn} onPress={() => setContentReportVisible(true)}>
                  <MaterialIcons name="flag" size={18} color={colors.textMuted} />
                  <Text style={[styles.reportBtnText, { color: colors.textMuted }]}>Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.reportBtn} onPress={handleBlockSeller} disabled={blocking}>
                  <MaterialIcons name="block" size={18} color={colors.textMuted} />
                  <Text style={[styles.reportBtnText, { color: colors.textMuted }]}>Block</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
      <SafetyWarningModal
        visible={safetyModal.visible}
        onAcknowledge={onSafetyAcknowledge}
        onClose={() => setSafetyModal({ visible: false, action: null })}
      />
      <ReportOptionsModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        targetType="marketplace"
        targetId={itemId}
        targetUserId={sellerId}
        onBlocked={() => navigation.goBack()}
        onReportListingPress={() => {
          setReportModalVisible(false);
          setContentReportVisible(true);
        }}
      />
      <ContentReportModal
        visible={contentReportVisible}
        onClose={() => setContentReportVisible(false)}
        targetType="marketplace"
        targetId={itemId}
        onReported={() => setContentReportVisible(false)}
      />
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    moreBtn: { padding: spacing.sm },
    carouselDots: { flexDirection: "row", justifyContent: "center", gap: 6, position: "absolute", bottom: 12, left: 0, right: 0 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    dotInactive: { backgroundColor: "rgba(255,255,255,0.5)" },
    pendingBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
    },
    pendingBannerText: { fontSize: 14, fontWeight: "600" },
    riskBanner: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
    },
    riskBannerText: { fontSize: 13, marginTop: spacing.xs },
    badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
    badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: 8, backgroundColor: colors.surfaceLight },
    badgeReported: { backgroundColor: "rgba(234,179,8,0.2)" },
    badgePending: { backgroundColor: "rgba(99,102,241,0.2)" },
    badgeText: { fontSize: 12, fontWeight: "600", color: colors.text },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
    scroll: { flex: 1 },
    content: { paddingBottom: spacing.xl },
    heroScroll: { width: Dimensions.get("window").width, height: 280 },
    hero: { width: Dimensions.get("window").width, height: 280, backgroundColor: colors.surfaceLight },
    heroPlaceholder: { justifyContent: "center", alignItems: "center" },
    soldBanner: { position: "absolute", top: 300, alignSelf: "center", backgroundColor: colors.error, paddingVertical: 8, paddingHorizontal: 24, borderRadius: 8 },
    soldBannerText: { fontSize: 18, fontWeight: "800", color: colors.white },
    body: { padding: spacing.md },
    title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
    price: { fontSize: 20, fontWeight: "700", color: colors.primary, marginBottom: spacing.sm },
    meta: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
    rowText: { fontSize: 15, color: colors.text },
    description: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: spacing.lg },
    sellerSection: { marginBottom: spacing.md },
    sellerLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.xs },
    sellerRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
    sellerVerified: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    buyBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: 12,
      marginBottom: spacing.md,
    },
    buyBtnText: { fontSize: 16, fontWeight: "700", color: colors.white },
    actionRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
    chatBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: 12 },
    chatBtnDisabled: { opacity: 0.7 },
    chatBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
    callBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: 12, borderWidth: 1 },
    callBtnText: { fontSize: 16, fontWeight: "600" },
    reportRow: { flexDirection: "row", gap: spacing.lg },
    reportBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    reportBtnText: { fontSize: 14 },
    errorText: { fontSize: 15, color: colors.error, textAlign: "center", marginBottom: spacing.sm },
    retryText: { fontSize: 15, fontWeight: "600", color: colors.primary },
    imageViewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" },
    imageViewerScroll: { flex: 1 },
    imageViewerContent: { alignItems: "center" },
    imageViewerItem: { width: Dimensions.get("window").width, height: Dimensions.get("window").height - 100, justifyContent: "center" },
    imageViewerImage: { width: "100%", height: "100%" },
    imageViewerClose: { position: "absolute", bottom: 40, alignSelf: "center", color: "rgba(255,255,255,0.7)", fontSize: 14 },
  });
}
