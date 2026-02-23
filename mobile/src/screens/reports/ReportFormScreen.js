import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { uploadToCloudinary } from "../../utils/env";
import { REPORT_REASONS, createReport } from "../../services/reports.api";

export default function ReportFormScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isLoggedIn = !!useAuthStore((s) => s.token);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [evidencePhotos, setEvidencePhotos] = useState([]);
  const [evidenceVideos, setEvidenceVideos] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Allow photo library access to add evidence.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    if (evidencePhotos.length >= 6) {
      Alert.alert("Limit", "Maximum 6 images.");
      return;
    }
    setUploadingMedia(true);
    try {
      const url = await uploadToCloudinary(result.assets[0].uri, "image");
      if (url) setEvidencePhotos((p) => [...p, url].slice(0, 6));
    } catch (e) {
      Alert.alert("Upload failed", e?.message ?? "Could not upload image.");
    } finally {
      setUploadingMedia(false);
    }
  }, [evidencePhotos.length]);

  const pickVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Allow media access to add video evidence.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    if (evidenceVideos.length >= 6) {
      Alert.alert("Limit", "Maximum 6 videos.");
      return;
    }
    setUploadingMedia(true);
    try {
      const url = await uploadToCloudinary(result.assets[0].uri, "video");
      if (url) setEvidenceVideos((v) => [...v, url].slice(0, 6));
    } catch (e) {
      Alert.alert("Upload failed", e?.message ?? "Could not upload video.");
    } finally {
      setUploadingMedia(false);
    }
  }, [evidenceVideos.length]);

  const removePhoto = useCallback((i) => setEvidencePhotos((p) => p.filter((_, idx) => idx !== i)), []);
  const removeVideo = useCallback((i) => setEvidenceVideos((v) => v.filter((_, idx) => idx !== i)), []);

  const handleSubmit = useCallback(async () => {
    if (!isLoggedIn) {
      Alert.alert("Login required", "Please sign in to submit a report.");
      return;
    }
    const phone = (phoneNumber || "").trim();
    if (!phone) {
      Alert.alert("Required", "Phone number is required.");
      return;
    }
    const r = (reason || "").trim();
    if (!r) {
      Alert.alert("Required", "Please select a reason.");
      return;
    }
    setSubmitting(true);
    try {
      await createReport({
        phoneNumber: phone,
        employerName: employerName.trim() || undefined,
        reason: r,
        description: description.trim() || undefined,
        locationText: locationText.trim() || undefined,
        evidence: { photos: evidencePhotos, videos: evidenceVideos },
      });
      Alert.alert("Submitted", "Your report has been submitted.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message || err?.message || "Failed to submit report.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  }, [isLoggedIn, phoneNumber, employerName, reason, description, locationText, evidencePhotos, evidenceVideos, navigation]);

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholderText}>Please sign in to submit a report.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Scammer</Text>
        <View style={styles.headerRight} />
      </View>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Phone number *</Text>
        <TextInput
          style={styles.input}
          placeholder="+971..."
          placeholderTextColor={colors.textMuted}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Employer / Name (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Name of reported person"
          placeholderTextColor={colors.textMuted}
          value={employerName}
          onChangeText={setEmployerName}
        />

        <Text style={styles.label}>Reason *</Text>
        <View style={styles.chips}>
          {REPORT_REASONS.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.chip, reason === r.value && styles.chipActive]}
              onPress={() => setReason(r.value)}
            >
              <Text style={[styles.chipText, reason === r.value && styles.chipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What happened?"
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Location (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Where did this occur?"
          placeholderTextColor={colors.textMuted}
          value={locationText}
          onChangeText={setLocationText}
        />

        <Text style={styles.label}>Evidence (optional)</Text>
        <Text style={styles.hint}>Add images or videos from your device</Text>
        <View style={styles.evidenceRow}>
          <TouchableOpacity
            style={[styles.evidenceBtn, uploadingMedia && styles.evidenceBtnDisabled]}
            onPress={pickImage}
            disabled={uploadingMedia || evidencePhotos.length >= 6}
          >
            {uploadingMedia ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="add-a-photo" size={24} color={colors.primary} />
            )}
            <Text style={styles.evidenceBtnText}>Add image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.evidenceBtn, uploadingMedia && styles.evidenceBtnDisabled]}
            onPress={pickVideo}
            disabled={uploadingMedia || evidenceVideos.length >= 6}
          >
            <MaterialIcons name="videocam" size={24} color={colors.primary} />
            <Text style={styles.evidenceBtnText}>Add video</Text>
          </TouchableOpacity>
        </View>
        {evidencePhotos.length > 0 && (
          <View style={styles.mediaWrap}>
            {evidencePhotos.map((uri, i) => (
              <View key={`p-${i}`} style={styles.mediaItem}>
                <Image source={{ uri }} style={styles.mediaThumb} resizeMode="cover" />
                <TouchableOpacity style={styles.removeMedia} onPress={() => removePhoto(i)}>
                  <MaterialIcons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {evidenceVideos.length > 0 && (
          <View style={styles.mediaWrap}>
            {evidenceVideos.map((_, i) => (
              <View key={`v-${i}`} style={styles.mediaItem}>
                <View style={[styles.mediaThumb, styles.videoPlaceholder]}>
                  <MaterialIcons name="videocam" size={32} color={colors.textMuted} />
                </View>
                <TouchableOpacity style={styles.removeMedia} onPress={() => removeVideo(i)}>
                  <MaterialIcons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.submitBtnText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { padding: spacing.sm },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
    headerRight: { width: 40 },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm },
    input: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textArea: { minHeight: 80, textAlignVertical: "top" },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
      borderRadius: 20,
      backgroundColor: colors.surfaceLight,
    },
    chipActive: { backgroundColor: colors.primary },
    chipText: { fontSize: 13, color: colors.text },
    chipTextActive: { fontSize: 13, color: colors.white, fontWeight: "600" },
    submitBtn: {
      marginTop: spacing.lg,
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: spacing.md,
      alignItems: "center",
    },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
    hint: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
    evidenceRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
    evidenceBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    evidenceBtnDisabled: { opacity: 0.6 },
    evidenceBtnText: { fontSize: 14, fontWeight: "600", color: colors.primary },
    mediaWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
    mediaItem: { position: "relative", width: 72, height: 72 },
    mediaThumb: { width: 72, height: 72, borderRadius: 8 },
    videoPlaceholder: { backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    removeMedia: { position: "absolute", top: -4, right: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.error, justifyContent: "center", alignItems: "center" },
    placeholderText: { fontSize: 15, color: colors.textMuted, textAlign: "center", margin: spacing.lg },
    backBtn: { alignSelf: "center", padding: spacing.md },
    backBtnText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  });
}
