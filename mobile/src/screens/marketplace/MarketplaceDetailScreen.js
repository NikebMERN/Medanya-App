import React, { useState, useCallback, useEffect, useMemo } from "react";
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
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import * as marketplaceApi from "../../services/marketplace.api";
import * as chatApi from "../../services/chat.api";

export default function MarketplaceDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId) ?? "";

  const itemId = route.params?.itemId;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatting, setChatting] = useState(false);

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

  const handleChatWithSeller = useCallback(async () => {
    const sellerId = item?.seller_id ?? item?.sellerId;
    if (!sellerId) {
      Alert.alert("Error", "Seller information not available.");
      return;
    }
    if (String(sellerId) === String(userId)) {
      Alert.alert("Notice", "This is your own listing.");
      return;
    }
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
  }, [item, userId, navigation]);

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Item</Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {images[0] ? (
          <Image source={{ uri: images[0] }} style={styles.hero} resizeMode="cover" />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]}>
            <MaterialIcons name="image-not-supported" size={56} color={colors.textMuted} />
          </View>
        )}
        {isSold ? (
          <View style={styles.soldBanner}>
            <Text style={styles.soldBannerText}>SOLD</Text>
          </View>
        ) : null}
        <View style={styles.body}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.price}>AED {item.price != null ? item.price : "—"}</Text>
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
    </View>
  );
}

function createStyles(colors, paddingTop = 0) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", paddingTop: paddingTop + spacing.sm, paddingBottom: spacing.md, paddingHorizontal: spacing.sm, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { padding: spacing.sm },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
    headerRight: { width: 40 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
    scroll: { flex: 1 },
    content: { paddingBottom: spacing.xl },
    hero: { width: "100%", height: 280, backgroundColor: colors.surfaceLight },
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
  });
}
