/**
 * KYC Identity Verification screen.
 * Choose document type, upload images, consent, submit.
 */
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
  Switch,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { uploadToCloudinary } from "../../utils/env";
import * as kycApi from "../../api/kyc.api";

const PRIVACY_NOTICE =
  "We store only minimal metadata (document type, last 4 digits, and a secure hash). " +
  "Images are stored privately and may be deleted after verification or account closure. " +
  "We never store your full document number.";

export default function KycScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [frontUri, setFrontUri] = useState(null);
  const [backUri, setBackUri] = useState(null);
  const [selfieUri, setSelfieUri] = useState(null);
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await kycApi.getKycStatus();
      setStatus(data);
    } catch (e) {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const pickFront = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? "images",
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setFrontUri(result.assets[0].uri);
  }, []);

  const pickBack = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? "images",
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setBackUri(result.assets[0].uri);
  }, []);

  const pickSelfie = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Allow photo library access for selfie.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setSelfieUri(result.assets[0].uri);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!docType) {
      Alert.alert("Required", "Select document type.");
      return;
    }
    if (!frontUri) {
      Alert.alert("Required", "Upload front image of your document.");
      return;
    }
    if (!selfieUri) {
      Alert.alert("Required", "Upload a selfie so we can match your face to your document.");
      return;
    }
    const docNum = String(docNumber || "").trim();
    if (!docNum) {
      Alert.alert("Required", "Document number is required for verification.");
      return;
    }
    if (!consent) {
      Alert.alert("Consent required", "Please accept the privacy notice to continue.");
      return;
    }
    setSubmitting(true);
    setUploading(true);
    try {
      const [frontUrl, selfieUrl] = await Promise.all([
        uploadToCloudinary(frontUri, "image"),
        uploadToCloudinary(selfieUri, "image"),
      ]);
      let backUrl = null;
      if (backUri) backUrl = await uploadToCloudinary(backUri, "image");
      setUploading(false);
      await kycApi.submitKyc({
        docType,
        docNumber: docNum,
        frontImageUrl: frontUrl,
        backImageUrl: backUrl,
        selfieImageUrl: selfieUrl,
        consent: true,
      });
      Alert.alert("Submitted", "Your document and selfie have been submitted for review. Your face will be matched to your document before you can post jobs or list items.");
      loadStatus();
      setFrontUri(null);
      setBackUri(null);
      setSelfieUri(null);
      setDocNumber("");
    } catch (e) {
      setUploading(false);
      Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }, [docType, docNumber, frontUri, backUri, selfieUri, consent, loadStatus]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const kycStatus = status?.kycStatus || "none";
  const latest = status?.latestSubmission;
  const isVerified = kycStatus === "verified";
  const isRejected = latest?.status === "rejected";

  const docTypeConfig = kycApi.KYC_DOC_TYPES.find((t) => t.value === docType);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Identity Verification</Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {isVerified && (
          <View style={styles.statusCard}>
            <MaterialIcons name="verified" size={48} color={colors.success} />
            <Text style={styles.statusTitle}>Verified Identity</Text>
            <Text style={styles.statusText}>Your identity has been verified.</Text>
          </View>
        )}

        {isRejected && (
          <View style={[styles.statusCard, styles.statusRejected]}>
            <MaterialIcons name="cancel" size={48} color={colors.error} />
            <Text style={styles.statusTitle}>Rejected</Text>
            {latest?.reject_reason && (
              <Text style={styles.statusText}>Reason: {latest.reject_reason}</Text>
            )}
            <Text style={styles.statusHint}>You can re-submit with a different document.</Text>
          </View>
        )}

        {latest?.status === "pending" && (
          <View style={[styles.statusCard, styles.statusPending]}>
            <MaterialIcons name="schedule" size={48} color={colors.warning} />
            <Text style={styles.statusTitle}>Pending Review</Text>
            <Text style={styles.statusText}>Your submission is under review.</Text>
          </View>
        )}

        {!isVerified && (
          <>
            <Text style={styles.sectionTitle}>Document type</Text>
            <View style={styles.chips}>
              {kycApi.KYC_DOC_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, docType === t.value && styles.chipActive]}
                  onPress={() => setDocType(t.value)}
                >
                  <Text style={[styles.chipText, docType === t.value && styles.chipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Document images</Text>
            <View style={styles.imageRow}>
              <TouchableOpacity style={styles.imageSlot} onPress={pickFront}>
                {frontUri ? (
                  <Image source={{ uri: frontUri }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialIcons name="add-a-photo" size={32} color={colors.textMuted} />
                    <Text style={styles.imageLabel}>Front</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageSlot} onPress={pickBack}>
                {backUri ? (
                  <Image source={{ uri: backUri }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialIcons name="add-a-photo" size={32} color={colors.textMuted} />
                    <Text style={styles.imageLabel}>Back (optional)</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Selfie (face match)</Text>
            <Text style={styles.hint}>We will match your face to the photo on your document. Required to post jobs or list items.</Text>
            <TouchableOpacity style={styles.selfieSlot} onPress={pickSelfie}>
              {selfieUri ? (
                <Image source={{ uri: selfieUri }} style={styles.selfieThumb} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialIcons name="face" size={32} color={colors.textMuted} />
                  <Text style={styles.imageLabel}>Add selfie</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Document number *</Text>
            <Text style={styles.hint}>{docTypeConfig?.hint || "We store only the last 4 digits for verification."}</Text>
            <TextInput
              style={styles.input}
              placeholder={docTypeConfig?.placeholder || "Enter document number"}
              placeholderTextColor={colors.textMuted}
              value={docNumber}
              onChangeText={setDocNumber}
              autoCapitalize="characters"
            />

            <View style={styles.consentRow}>
              <Switch value={consent} onValueChange={setConsent} />
              <Text style={styles.consentText}>
                I consent to submit my ID for verification. {PRIVACY_NOTICE}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, (submitting || uploading) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || uploading}
            >
              {submitting || uploading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {latest?.status === "rejected" ? "Re-submit" : "Submit for review"}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: spacing.sm },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
    headerRight: { width: 40 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    scroll: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 3 },
    statusCard: {
      alignItems: "center",
      padding: spacing.xl,
      marginBottom: spacing.lg,
      borderRadius: 12,
      backgroundColor: colors.surfaceLight,
    },
    statusRejected: { borderWidth: 1, borderColor: colors.error },
    statusPending: { borderWidth: 1, borderColor: colors.warning },
    statusTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
    statusText: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs, textAlign: "center" },
    statusHint: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm },
    sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: spacing.md,
      borderRadius: 20,
      backgroundColor: colors.surfaceLight,
    },
    chipActive: { backgroundColor: colors.primary },
    chipText: { fontSize: 14, color: colors.text },
    chipTextActive: { fontSize: 14, color: colors.white, fontWeight: "600" },
    imageRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
    imageSlot: { flex: 1, aspectRatio: 4 / 3, borderRadius: 12, overflow: "hidden" },
    thumb: { width: "100%", height: "100%" },
    selfieSlot: { width: 120, height: 120, borderRadius: 60, overflow: "hidden", alignSelf: "center", marginBottom: spacing.md },
    selfieThumb: { width: "100%", height: "100%" },
    imagePlaceholder: {
      flex: 1,
      aspectRatio: 4 / 3,
      borderRadius: 12,
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    imageLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    hint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },
    input: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.sm,
    },
    consentRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.lg },
    consentText: { flex: 1, fontSize: 13, color: colors.textSecondary },
    submitBtn: {
      marginTop: spacing.xl,
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: spacing.md,
      alignItems: "center",
    },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
  });
}
