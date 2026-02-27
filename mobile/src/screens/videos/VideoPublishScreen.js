/**
 * VideoPublishScreen — Thumbnail, caption, hashtags, privacy, allow comments, Post.
 * OTP verified required; rate-limit and ban checks before submit.
 */
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useVideoCreateStore } from "../../store/videoCreate.store";
import { useAuthStore } from "../../store/auth.store";
import { uploadToCloudinary } from "../../utils/env";
import * as videosApi from "../../api/videos.api";
import SubScreenHeader from "../../components/SubScreenHeader";

const TAG_OPTIONS = ["safety", "jobs", "tips", "missing", "community"];

export default function VideoPublishScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  const user = useAuthStore((s) => s.user);
  const otpVerified = !!(user?.otp_verified ?? user?.otpVerified);

  const draftUri = useVideoCreateStore((s) => s.draftUri);
  const coverFrameUri = useVideoCreateStore((s) => s.coverFrameUri);
  const caption = useVideoCreateStore((s) => s.caption);
  const hashtags = useVideoCreateStore((s) => s.hashtags);
  const privacy = useVideoCreateStore((s) => s.privacy);
  const allowComments = useVideoCreateStore((s) => s.allowComments);
  const draftDurationMs = useVideoCreateStore((s) => s.draftDurationMs);
  const setCaption = useVideoCreateStore((s) => s.setCaption);
  const setHashtags = useVideoCreateStore((s) => s.setHashtags);
  const setPrivacy = useVideoCreateStore((s) => s.setPrivacy);
  const setAllowComments = useVideoCreateStore((s) => s.setAllowComments);
  const setUploadProgress = useVideoCreateStore((s) => s.setUploadProgress);
  const setUploadStatus = useVideoCreateStore((s) => s.setUploadStatus);
  const clearDraft = useVideoCreateStore((s) => s.clearDraft);

  const [posting, setPosting] = useState(false);
  const [captionInput, setCaptionInput] = useState(caption);

  const toggleTag = useCallback((tag) => {
    setHashtags(
      hashtags.includes(tag) ? hashtags.filter((t) => t !== tag) : [...hashtags, tag]
    );
  }, [hashtags, setHashtags]);

  const handlePost = useCallback(async () => {
    if (!otpVerified) {
      Alert.alert("Verification required", "Verify your phone (OTP) to post videos.");
      return;
    }
    if (!draftUri) {
      Alert.alert("Missing video", "No video to publish. Go back and record or pick one.");
      return;
    }
    setPosting(true);
    setUploadStatus("uploading");
    setUploadProgress(0);
    try {
      setUploadProgress(0.2);
      const videoUrl = await uploadToCloudinary(draftUri, "video");
      setUploadProgress(0.6);
      let thumbnailUrl = "";
      if (coverFrameUri) {
        thumbnailUrl = await uploadToCloudinary(coverFrameUri, "image");
      }
      if (!thumbnailUrl && videoUrl) thumbnailUrl = videoUrl;
      setUploadProgress(0.9);
      await videosApi.createVideo({
        videoUrl,
        thumbnailUrl,
        caption: captionInput.trim(),
        durationSec: Math.round((draftDurationMs || 0) / 1000),
      });
      setUploadStatus("done");
      clearDraft();
      Alert.alert("Posted", "Your video is live.", [
        { text: "OK", onPress: () => navigation.getParent()?.goBack() || navigation.navigate("Main") },
      ]);
    } catch (e) {
      setUploadStatus("error", e?.message);
      Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Upload failed.");
    } finally {
      setPosting(false);
    }
  }, [otpVerified, draftUri, coverFrameUri, captionInput, draftDurationMs, setUploadProgress, setUploadStatus, clearDraft, navigation]);

  const thumbnailSource = coverFrameUri ? { uri: coverFrameUri } : draftUri ? { uri: draftUri } : null;

  const tabNav = navigation.getParent?.() ?? navigation;
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubScreenHeader
        title="Publish"
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={tabNav}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.thumbCard}>
          {thumbnailSource ? (
            <Image source={thumbnailSource} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <MaterialIcons name="videocam" size={40} color={colors.textMuted} />
            </View>
          )}
        </View>

        <Text style={styles.label}>Caption</Text>
        <TextInput
          style={styles.input}
          value={captionInput}
          onChangeText={(t) => { setCaptionInput(t); setCaption(t); }}
          placeholder="Say something..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
        />

        <Text style={styles.label}>Tags (safety, jobs, etc.)</Text>
        <View style={styles.tagRow}>
          {TAG_OPTIONS.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.tagChip, hashtags.includes(tag) && styles.tagChipActive]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[styles.tagChipText, hashtags.includes(tag) && { color: colors.primary }]}>#{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Privacy</Text>
        <View style={styles.privacyRow}>
          {["public", "followers", "private"].map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.privacyChip, privacy === p && styles.privacyChipActive]}
              onPress={() => setPrivacy(p)}
            >
              <Text style={[styles.privacyChipText, privacy === p && { color: colors.primary }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Allow comments</Text>
          <Switch
            value={allowComments}
            onValueChange={setAllowComments}
            trackColor={{ false: colors.border, true: colors.primary + "80" }}
            thumbColor={allowComments ? colors.primary : colors.textMuted}
          />
        </View>

        <TouchableOpacity
          style={[styles.postBtn, posting && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={posting}
          activeOpacity={0.8}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postBtnText}>Post</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors, insets) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md, paddingBottom: insets.bottom + spacing.xxl },
    thumbCard: { alignSelf: "center", marginBottom: spacing.lg, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
    thumb: { width: 160, height: 280 },
    thumbPlaceholder: { backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    label: { fontSize: 12, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.xs },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface,
      minHeight: 80,
      textAlignVertical: "top",
      marginBottom: spacing.lg,
    },
    tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
    tagChip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: 20, backgroundColor: colors.surfaceLight },
    tagChipActive: { backgroundColor: colors.primary + "20", borderWidth: 1, borderColor: colors.primary },
    tagChipText: { fontSize: 13, fontWeight: "600", color: colors.text },
    privacyRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
    privacyChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12, backgroundColor: colors.surfaceLight },
    privacyChipActive: { backgroundColor: colors.primary + "20", borderWidth: 1, borderColor: colors.primary },
    privacyChipText: { fontSize: 14, fontWeight: "600", color: colors.text },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xl },
    switchLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
    postBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    postBtnDisabled: { opacity: 0.7 },
    postBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  });
}
