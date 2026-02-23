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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import * as marketplaceApi from "../../services/marketplace.api";
import * as chatApi from "../../services/chat.api";
import * as activityApi from "../../services/activity.api";
import SafetyModal from "../../components/common/SafetyModal";
import ReportOptionsModal from "../../components/common/ReportOptionsModal";

export default function MarketplaceDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? user?.userId ?? "";
  const safetyAcknowledged = user?.safety_acknowledged_at ?? user?.safetyAcknowledgedAt;

  const itemId = route.params?.itemId;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatting, setChatting] = useState(false);
  const [safetyModal, setSafetyModal] = useState({ visible: false, action: "chat" });
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const imageViewerScrollRef = useRef(null);

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
    }
  }, [item, itemId, userId]);

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
    if (!safetyAcknowledged) {
      setSafetyModal({ visible: true, action: "chat" });
      return;
    }
    doChatWithSeller();
  }, [item, userId, safetyAcknowledged, doChatWithSeller]);

  const onSafetyAcknowledge = useCallback(() => {
    setSafetyModal((prev) => {
      if (prev.action === "chat") doChatWithSeller();
      return { visible: false, action: null };
    });
  }, [doChatWithSeller]);

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
  const isSold = item.status === "sold";
  const sellerId = item.seller_id ?? item.sellerId;
  const isOwn = String(sellerId) === String(userId);
  const priceCurrency = item.currency || "AED";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Item</Text>
        <View style={styles.headerRight}>
          {!isOwn && (
            <TouchableOpacity style={styles.moreBtn} onPress={() => setReportModalVisible(true)}>
              <MaterialIcons name="more-vert" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {images.length > 0 ? (
          <TouchableOpacity activeOpacity={1} onPress={() => { setImageViewerIndex(0); setImageViewerVisible(true); }}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.heroScroll}>
              {images.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.hero} resizeMode="cover" />
              ))}
            </ScrollView>
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
            <TouchableOpacity
              style={[styles.chatBtn, chatting && styles.chatBtnDisabled]}
              onPress={handleChatWithSeller}
              disabled={chatting}
            >
              {chatting ? <ActivityIndicator size="small" color={colors.white} /> : <><MaterialIcons name="chat" size={22} color={colors.white} /><Text style={styles.chatBtnText}>Chat with seller</Text></>}
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
      <SafetyModal
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
      />
    </SafeAreaView>
  );
}

function createStyles(colors, _paddingTop = 0) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, paddingHorizontal: spacing.sm, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { padding: spacing.sm },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
    headerRight: { width: 40 },
    moreBtn: { padding: spacing.sm },
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
    chatBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: 12 },
    chatBtnDisabled: { opacity: 0.7 },
    chatBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
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
