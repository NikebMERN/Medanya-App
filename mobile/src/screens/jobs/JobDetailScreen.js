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
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import * as jobsApi from "../../services/jobs.api";
import * as chatApi from "../../services/chat.api";

export default function JobDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);

  const jobId = route.params?.jobId;
  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId) ?? "";

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(false);
  const [chatting, setChatting] = useState(false);

  const loadJob = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await jobsApi.getJob(jobId);
      setJob(data ?? null);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || "Failed to load job.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  const handleApply = useCallback(async () => {
    if (!jobId) return;
    setApplying(true);
    try {
      await jobsApi.applyToJob(jobId);
      Alert.alert("Applied", "Your application has been submitted.");
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || "Failed to apply.";
      Alert.alert("Error", msg);
    } finally {
      setApplying(false);
    }
  }, [jobId]);

  const handleChatWithEmployer = useCallback(async () => {
    const createdBy = job?.created_by ?? job?.createdBy;
    if (!createdBy) {
      Alert.alert("Error", "Employer information not available.");
      return;
    }
    if (String(createdBy) === String(userId)) {
      Alert.alert("Notice", "This is your own job posting.");
      return;
    }
    setChatting(true);
    try {
      const data = await chatApi.startDirect(createdBy);
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
  }, [job, userId, navigation]);

  const handleCall = useCallback(() => {
    const phone = job?.contact_phone ?? job?.contactPhone ?? "";
    if (!phone) {
      Alert.alert("Notice", "No contact number available.");
      return;
    }
    const tel = phone.trim().startsWith("+") ? phone.trim() : `+${phone.trim()}`;
    Linking.openURL(`tel:${tel}`).catch(() => Alert.alert("Error", "Could not open dialer."));
  }, [job]);

  if (loading && !job) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error && !job) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadJob}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Job not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const createdBy = job.created_by ?? job.createdBy;
  const isOwnJob = String(createdBy) === String(userId);
  const avgRating = job.avgRating ?? job.avg_rating;
  const ratingCount = job.ratingCount ?? job.rating_count ?? 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Job Details</Text>
        <View style={styles.headerRight} />
      </View>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {job.image_url || job.imageUrl ? (
        <Image source={{ uri: job.image_url || job.imageUrl }} style={styles.hero} resizeMode="cover" />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <MaterialIcons name="work" size={56} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title}>{job.title}</Text>
        <View style={styles.meta}>
          <Text style={styles.category}>{job.category || "Job"}</Text>
          {avgRating != null && (
            <View style={styles.rating}>
              <MaterialIcons name="star" size={16} color={colors.warning} />
              <Text style={styles.ratingText}>
                {Number(avgRating).toFixed(1)}
                {ratingCount > 0 ? ` (${ratingCount})` : ""}
              </Text>
            </View>
          )}
        </View>
        {job.salary ? (
          <View style={styles.row}>
            <MaterialIcons name="attach-money" size={20} color={colors.textSecondary} />
            <Text style={styles.rowText}>{job.salary}</Text>
          </View>
        ) : null}
        {job.location ? (
          <View style={styles.row}>
            <MaterialIcons name="location-on" size={20} color={colors.textSecondary} />
            <Text style={styles.rowText}>{job.location}</Text>
          </View>
        ) : null}
        {(job.contact_phone || job.contactPhone) ? (
          <View style={styles.row}>
            <MaterialIcons name="phone" size={20} color={colors.textSecondary} />
            <Text style={styles.rowText}>{job.contact_phone || job.contactPhone}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={handleApply}
            disabled={applying}
            activeOpacity={0.8}
          >
            {applying ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.btnPrimaryText}>Apply</Text>
            )}
          </TouchableOpacity>
          {!isOwnJob && createdBy ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={handleChatWithEmployer}
              disabled={chatting}
              activeOpacity={0.8}
            >
              {chatting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <MaterialIcons name="chat" size={20} color={colors.primary} />
                  <Text style={styles.btnSecondaryText}>Chat with employer</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
          {(job.contact_phone || job.contactPhone) ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnOutlined]}
              onPress={handleCall}
              activeOpacity={0.8}
            >
              <MaterialIcons name="call" size={20} color={colors.primary} />
              <Text style={styles.btnOutlinedText}>Call</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

function createStyles(colors, paddingTop = 0) {
  return StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.sm,
      paddingTop: paddingTop + spacing.sm,
      paddingBottom: spacing.md,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: spacing.sm },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
    headerRight: { width: 40 },
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: spacing.xl },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
      padding: spacing.lg,
    },
    hero: { width: "100%", height: 200, backgroundColor: colors.surfaceLight },
    heroPlaceholder: {
      justifyContent: "center",
      alignItems: "center",
    },
    body: { padding: spacing.md },
    title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    meta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
    category: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      textTransform: "capitalize",
    },
    rating: { flexDirection: "row", alignItems: "center", gap: 4 },
    ratingText: { fontSize: 14, color: colors.textSecondary },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    rowText: { fontSize: 15, color: colors.text },
    actions: { marginTop: spacing.lg, gap: spacing.sm },
    btn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
      gap: spacing.sm,
    },
    btnPrimary: { backgroundColor: colors.primary },
    btnPrimaryText: { fontSize: 16, fontWeight: "600", color: colors.white },
    btnSecondary: {
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    btnSecondaryText: { fontSize: 16, fontWeight: "600", color: colors.primary },
    btnOutlined: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border,
    },
    btnOutlinedText: { fontSize: 16, fontWeight: "600", color: colors.primary },
    errorText: { fontSize: 15, color: colors.error, textAlign: "center", marginBottom: spacing.sm },
    retryBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
    retryText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  });
}
