/**
 * KYC data mismatch: document data doesn't match profile.
 * User can tap "Sure, change my data" to update profile from document and make account private.
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import * as kycApi from "../../api/kyc.api";
import { getMe } from "../../api/user.api";
import { useAuthStore } from "../../store/auth.store";

export default function KycMismatchScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useThemeColors();
  const { updateUser } = useAuthStore();

  const submissionId = route.params?.submissionId;
  const docFullName = route.params?.docFullName;
  const docBirthdate = route.params?.docBirthdate;
  const faceMatch = route.params?.faceMatch ?? false;

  const [confirming, setConfirming] = useState(false);

  const handleConfirmChange = async () => {
    if (!submissionId) {
      Alert.alert("Error", "Missing submission. Please try again.");
      return;
    }
    setConfirming(true);
    try {
      const result = await kycApi.confirmKycDataChange(submissionId);
      if (result?.user) {
        updateUser(result.user);
      } else {
        const res = await getMe();
        if (res?.user) updateUser(res.user);
      }
      const msg = result?.verified
        ? "Your profile has been updated to match your document. Your account is now private and personal data is hidden. Identity verified."
        : "Your profile has been updated to match your document. Your account is now private and personal data will stay hidden. Face verification is pending review.";
      Alert.alert("Done", msg, [
        {
          text: "OK",
          onPress: () => navigation.reset({ index: 0, routes: [{ name: "ProfileMain" }] }),
        },
      ]);
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Failed.");
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Identity not verified",
      "Your identity cannot be verified until your profile data matches your document. Update your full name and date of birth in Edit Profile, then try again.",
      [{ text: "OK", onPress: () => navigation.reset({ index: 0, routes: [{ name: "ProfileMain" }] }) }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Data mismatch</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.warning + "30" }]}>
          <MaterialIcons name="warning" size={48} color={colors.warning} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Document doesn't match profile</Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>
          The name and/or date of birth on your document don't match your profile.
        </Text>

        {(docFullName || docBirthdate) && (
          <View style={[styles.docData, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
            <Text style={[styles.docLabel, { color: colors.textMuted }]}>Document data:</Text>
            {docFullName && (
              <Text style={[styles.docValue, { color: colors.text }]}>Name: {docFullName}</Text>
            )}
            {docBirthdate && (
              <Text style={[styles.docValue, { color: colors.text }]}>DOB: {docBirthdate}</Text>
            )}
          </View>
        )}

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          You can update your profile to match the document. This will make your account private and hide your
          personal data (even if you later make your account public).
        </Text>

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
          onPress={handleConfirmChange}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>Sure, change my data</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={handleCancel}>
          <Text style={[styles.cancelText, { color: colors.text }]}>No, I'll update manually</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  backBtn: { padding: spacing.sm },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },
  headerRight: { width: 40 },
  content: { flex: 1, padding: spacing.lg },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: spacing.sm },
  desc: { fontSize: 15, textAlign: "center", marginBottom: spacing.lg },
  docData: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  docLabel: { fontSize: 12, marginBottom: 4 },
  docValue: { fontSize: 15, marginTop: 2 },
  hint: { fontSize: 14, marginBottom: spacing.xl, lineHeight: 20 },
  confirmBtn: {
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  confirmBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  cancelBtn: {
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelText: { fontSize: 15, fontWeight: "600" },
});
