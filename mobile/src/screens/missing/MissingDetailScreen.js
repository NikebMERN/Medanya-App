import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
  Share as ShareAPI,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import * as missingApi from "../../services/missing.api";
import VoiceMessagePlayer from "../../components/VoiceMessagePlayer";

export default function MissingDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId) ?? "";

  const id = route.params?.id;
  const [alert, setAlert] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [detailRes, commentsRes] = await Promise.all([
        missingApi.getMissingPerson(id),
        missingApi.listComments(id, { page: 1, limit: 50 }),
      ]);
      setAlert(detailRes ?? null);
      setComments(commentsRes?.comments ?? []);
    } catch (err) {
      setError(err?.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleCall = useCallback(() => {
    const phone = alert?.contactPhone ?? alert?.contact_phone ?? "";
    if (!phone) {
      Alert.alert("Notice", "No contact number available.");
      return;
    }
    const tel = phone.trim().startsWith("+") ? phone.trim() : `+${phone.trim()}`;
    Linking.openURL(`tel:${tel}`).catch(() => Alert.alert("Error", "Could not open dialer."));
  }, [alert]);

  const handleShare = useCallback(async () => {
    if (!alert) return;
    try {
      await ShareAPI.share({
        message: `Missing: ${alert.fullName || "Person"} - ${alert.description || ""}\nContact: ${alert.contactPhone || ""}`,
        title: "Missing Person Alert",
      });
    } catch (e) {
      if (e?.message !== "User did not share") {
        Alert.alert("Share", "Sharing not available.");
      }
    }
  }, [alert]);

  const handleAddComment = useCallback(async () => {
    if (!id || !userId) {
      Alert.alert("Login required", "Please sign in to comment.");
      return;
    }
    const text = (commentText || "").trim();
    if (!text) {
      Alert.alert("Required", "Enter a comment.");
      return;
    }
    setSubmitting(true);
    try {
      const newComment = await missingApi.addComment(id, { text });
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to add comment.");
    } finally {
      setSubmitting(false);
    }
  }, [id, userId, commentText]);

  if (loading && !alert) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !alert) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Not found"}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Missing Person
        </Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {alert.photoUrl ? (
          <Image source={{ uri: alert.photoUrl }} style={styles.hero} resizeMode="cover" />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]}>
            <MaterialIcons name="person" size={64} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.title}>{alert.fullName || "Missing Person"}</Text>
          {alert.lastKnownLocationText ? (
            <View style={styles.row}>
              <MaterialIcons name="location-on" size={20} color={colors.textSecondary} />
              <Text style={styles.rowText}>{alert.lastKnownLocationText}</Text>
            </View>
          ) : null}
          {alert.description ? (
            <Text style={styles.description}>{alert.description}</Text>
          ) : null}
          {alert.voiceUrl ? (
            <View style={styles.voiceSection}>
              <Text style={styles.sectionLabel}>Voice message</Text>
              <VoiceMessagePlayer mediaUrl={alert.voiceUrl} isOwn={false} />
            </View>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleCall}>
              <MaterialIcons name="call" size={22} color={colors.white} />
              <Text style={styles.btnPrimaryText}>Call family</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleShare}>
              <MaterialIcons name="share" size={22} color={colors.primary} />
              <Text style={styles.btnSecondaryText}>Share</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
          {comments.map((c) => (
            <View key={c._id || c.id || Math.random()} style={styles.commentCard}>
              {c.voiceUrl ? (
                <VoiceMessagePlayer mediaUrl={c.voiceUrl} isOwn={false} />
              ) : c.text ? (
                <Text style={styles.commentText}>{c.text}</Text>
              ) : null}
            </View>
          ))}

          {userId ? (
            <View style={styles.commentInput}>
              <TextInput
                style={styles.commentField}
                placeholder="Add a comment…"
                placeholderTextColor={colors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                style={[styles.commentBtn, submitting && styles.commentBtnDisabled]}
                onPress={handleAddComment}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.commentBtnText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors, paddingTop = 0) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: paddingTop + spacing.sm,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: spacing.sm },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
    headerRight: { width: 40 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
    scroll: { flex: 1 },
    content: { paddingBottom: spacing.xl },
    hero: { width: "100%", height: 280, backgroundColor: colors.surfaceLight },
    heroPlaceholder: { justifyContent: "center", alignItems: "center" },
    body: { padding: spacing.md },
    title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
    rowText: { fontSize: 15, color: colors.text },
    description: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: spacing.lg },
    voiceSection: { marginBottom: spacing.lg },
    sectionLabel: { fontSize: 14, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.sm },
    actions: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
    btnPrimary: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      gap: spacing.sm,
    },
    btnPrimaryText: { fontSize: 16, fontWeight: "600", color: colors.white },
    btnSecondary: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceLight,
      paddingVertical: spacing.md,
      borderRadius: 12,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    btnSecondaryText: { fontSize: 16, fontWeight: "600", color: colors.primary },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    commentCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    commentText: { fontSize: 14, color: colors.text },
    commentInput: { marginTop: spacing.md, gap: spacing.sm },
    commentField: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: 15,
      color: colors.text,
      minHeight: 80,
      textAlignVertical: "top",
    },
    commentBtn: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      alignItems: "center",
    },
    commentBtnDisabled: { opacity: 0.7 },
    commentBtnText: { fontSize: 15, fontWeight: "600", color: colors.white },
    errorText: { fontSize: 15, color: colors.error, textAlign: "center", marginBottom: spacing.sm },
    retryText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  });
}
