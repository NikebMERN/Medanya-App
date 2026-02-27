/**
 * KYC Step 2: Live selfie capture.
 * Uses front camera to take selfie, then submits with document for face matching.
 */
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { uploadToCloudinary } from "../../utils/env";
import * as kycApi from "../../api/kyc.api";
import SubScreenHeader from "../../components/SubScreenHeader";
import { getMe } from "../../api/user.api";
import { useAuthStore } from "../../store/auth.store";

export default function KycSelfieScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useThemeColors();
  const { user: storeUser, updateUser } = useAuthStore();

  const asBool = (v) => {
    if (v === true || v === 1) return true;
    if (v === false || v === 0 || v == null) return false;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      return s === "true" || s === "1" || s === "yes";
    }
    return false;
  };

  const docType = route.params?.docType;
  const docNumber = route.params?.docNumber;
  const docFullName = route.params?.docFullName;
  const docBirthdate = route.params?.docBirthdate;
  const frontImageUrl = route.params?.frontImageUrl;
  const backImageUrl = route.params?.backImageUrl;

  const [selfieUri, setSelfieUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMe();
        if (!cancelled && res?.user) {
          setProfileData(res.user);
        }
      } catch (_) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const takeSelfie = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Allow camera access to take a live selfie for face verification.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      cameraType: ImagePicker.CameraType?.front ?? "front",
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setSelfieUri(result.assets[0].uri);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selfieUri) {
      Alert.alert("Required", "Take a live selfie so we can match your face to your document.");
      return;
    }
    if (!frontImageUrl || !docNumber || !docType) {
      Alert.alert("Error", "Document data missing. Please go back and upload your document again.");
      return;
    }

    const fullName = docFullName?.trim() ?? profileData?.full_name ?? profileData?.fullName ?? storeUser?.full_name ?? storeUser?.fullName ?? "";
    const birthdate = docBirthdate ?? profileData?.dob ?? storeUser?.dob ?? null;

    if (!fullName) {
      Alert.alert(
        "Required",
        "Document name is required. Go back and enter the name as shown on your document."
      );
      return;
    }
    if (!birthdate) {
      Alert.alert(
        "Required",
        "Document date of birth is required. Go back and enter the DOB as shown on your document."
      );
      return;
    }

    setSubmitting(true);
    try {
      const selfieUrl = await uploadToCloudinary(selfieUri, "image");
      const result = await kycApi.submitKyc({
        docType,
        docNumber,
        frontImageUrl,
        backImageUrl: backImageUrl || undefined,
        selfieImageUrl: selfieUrl,
        fullName: fullName.trim(),
        birthdate,
        consent: true,
      });

      const verified = asBool(result?.verified);
      const dataMismatch = asBool(result?.dataMismatch);
      const faceMismatch = asBool(result?.faceMismatch);
      const requireDataChange = asBool(result?.requireDataChange);

      if (verified) {
        Alert.alert("Verified", "Your identity has been verified successfully.", [
          { text: "OK", onPress: () => navigation.reset({ index: 0, routes: [{ name: "ProfileMain" }] }) },
        ]);
        return;
      }

      if (requireDataChange && dataMismatch) {
        navigation.navigate("KycMismatch", {
          submissionId: result.submissionId,
          docFullName: result.extractedName || fullName,
          docBirthdate: result.extractedDob || birthdate,
          faceMatch: !faceMismatch,
        });
        return;
      }

      if (faceMismatch && !requireDataChange) {
        Alert.alert(
          "Face didn't match",
          "Your selfie didn't match the photo on your document. Please ensure good lighting and try again, or use a different document."
        );
        return;
      }

      Alert.alert("Submitted", "Your submission is under review.");
      navigation.reset({ index: 0, routes: [{ name: "ProfileMain" }] });
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }, [selfieUri, frontImageUrl, backImageUrl, docNumber, docType, docFullName, docBirthdate, profileData, storeUser, navigation]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <SubScreenHeader
        title="Live selfie"
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={navigation.getParent?.() ?? navigation}
      />

      <View style={styles.content}>
        <Text style={[styles.stepHint, { color: colors.textMuted }]}>
          Step 2 of 2 — Take a live selfie
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          We'll compare your face to the photo on your document for verification.
        </Text>

        <TouchableOpacity
          style={[styles.selfieSlot, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
          onPress={takeSelfie}
          activeOpacity={0.8}
        >
          {selfieUri ? (
            <Image source={{ uri: selfieUri }} style={styles.selfieThumb} resizeMode="cover" />
          ) : (
            <View style={styles.selfiePlaceholder}>
              <MaterialIcons name="face" size={64} color={colors.textMuted} />
              <Text style={[styles.selfieLabel, { color: colors.textMuted }]}>Take selfie</Text>
              <Text style={[styles.selfieHint, { color: colors.textMuted }]}>
                Use front camera • Good lighting
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {selfieUri && (
          <TouchableOpacity
            style={[styles.retakeBtn, { borderColor: colors.border }]}
            onPress={() => setSelfieUri(null)}
          >
            <MaterialIcons name="refresh" size={20} color={colors.text} />
            <Text style={[styles.retakeText, { color: colors.text }]}>Retake</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary },
            (submitting || !selfieUri) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || !selfieUri}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit for verification</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { flex: 1, padding: spacing.lg },
  stepHint: { fontSize: 13, marginBottom: spacing.xs },
  hint: { fontSize: 14, marginBottom: spacing.xl },
  selfieSlot: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignSelf: "center",
    overflow: "hidden",
    borderWidth: 2,
    marginBottom: spacing.lg,
  },
  selfieThumb: { width: "100%", height: "100%" },
  selfiePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  selfieLabel: { fontSize: 16, fontWeight: "600", marginTop: spacing.sm },
  selfieHint: { fontSize: 12, marginTop: 4 },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "center",
    marginBottom: spacing.xl,
  },
  retakeText: { fontSize: 14, fontWeight: "600" },
  submitBtn: {
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
    marginTop: "auto",
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});
