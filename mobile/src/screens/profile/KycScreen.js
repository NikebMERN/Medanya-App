/**
 * KYC Identity Verification hub.
 * Shows status; navigates to Doc Upload (step 1) then Selfie (step 2).
 */
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Alert } from "react-native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import * as kycApi from "../../api/kyc.api";
import SubScreenHeader from "../../components/SubScreenHeader";

export default function KycScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleStartVerification = useCallback(async () => {
    try {
      let data;
      try {
        data = await kycApi.startVeriffKyc();
        if (data?.sessionUrl && data?.sessionId) {
          data = { provider: "VERIFF", sessionUrl: data.sessionUrl, sessionId: data.sessionId };
        }
      } catch (veriffErr) {
        if (veriffErr?.response?.data?.error?.code === "CONFIG_ERROR") {
          data = await kycApi.startProviderKyc();
        } else {
          throw veriffErr;
        }
      }
      if (data?.provider === "VERIFF" && data?.sessionUrl) {
        navigation.navigate("VerifyIdentity", { provider: "VERIFF", sessionUrl: data.sessionUrl, sessionId: data.sessionId });
      } else if (data?.provider === "SUMSUB" && data?.accessToken) {
        navigation.navigate("VerifyIdentity", {
          provider: "SUMSUB",
          accessToken: data.accessToken,
          applicantId: data.applicantId,
        });
      } else {
        navigation.navigate("KycDocUpload");
      }
    } catch (e) {
      const code = e?.response?.data?.error?.code;
      const msg = e?.response?.data?.error?.message || e?.message || "Failed to start verification.";
      if (code === "CONFIG_ERROR") {
        navigation.navigate("KycDocUpload");
      } else if (code === "VALIDATION_ERROR") {
        Alert.alert("Required", msg);
      } else {
        Alert.alert("Error", msg);
      }
    }
  }, [navigation]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const kycStatus = status?.kycStatus || "none";
  const latest = status?.latestSubmission;
  const isVerified = kycStatus === "verified" || kycStatus === "verified_auto" || kycStatus === "verified_manual";
  const isRejected = kycStatus === "rejected" || latest?.status === "rejected";

  const tabNav = navigation.getParent?.() ?? navigation;
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubScreenHeader
        title="Identity Verification"
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={tabNav}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {isVerified && (
          <View style={styles.statusCard}>
            <MaterialIcons name="verified" size={48} color={colors.success} />
            <Text style={styles.statusTitle}>Verified Identity</Text>
            <Text style={styles.statusText}>Your identity has been verified.</Text>
          </View>
        )}

        {isRejected && !status?.provider && (
          <View style={[styles.statusCard, styles.statusRejected]}>
            <MaterialIcons name="cancel" size={48} color={colors.error} />
            <Text style={styles.statusTitle}>Rejected</Text>
            {latest?.reject_reason && (
              <Text style={styles.statusText}>Reason: {latest.reject_reason}</Text>
            )}
            <Text style={styles.statusHint}>You can re-submit with a different document.</Text>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => navigation.navigate("KycDocUpload")}
            >
              <Text style={styles.startBtnText}>Retry verification</Text>
            </TouchableOpacity>
          </View>
        )}

        {isRejected && status?.provider && (
          <View style={[styles.statusCard, styles.statusRejected]}>
            <MaterialIcons name="cancel" size={48} color={colors.error} />
            <Text style={styles.statusTitle}>Rejected</Text>
            {(status?.lastReason || latest?.reject_reason) && (
              <Text style={styles.statusText}>Reason: {status.lastReason || latest.reject_reason}</Text>
            )}
            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleStartVerification}
            >
              <Text style={styles.startBtnText}>Retry verification</Text>
            </TouchableOpacity>
          </View>
        )}

        {latest?.status === "pending_auto" && (
          <View style={[styles.statusCard, styles.statusPending]}>
            <MaterialIcons name="schedule" size={48} color={colors.warning} />
            <Text style={styles.statusTitle}>Verifying</Text>
            <Text style={styles.statusText}>Your submission is being verified.</Text>
          </View>
        )}

        {latest?.status === "pending_manual" && (
          <View style={[styles.statusCard, styles.statusPending]}>
            <MaterialIcons name="schedule" size={48} color={colors.warning} />
            <Text style={styles.statusTitle}>Pending Review</Text>
            <Text style={styles.statusText}>Your submission is under manual review.</Text>
          </View>
        )}

        {!isVerified && !isRejected && (
          <View style={styles.startCard}>
            <MaterialIcons name="badge" size={56} color={colors.primary} style={styles.startIcon} />
            <Text style={styles.startTitle}>Verify your identity</Text>
            <Text style={styles.startDesc}>
              Complete identity verification to post jobs or list items. Your verified document will provide your legal name and date of birth.
            </Text>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleStartVerification}
            >
              <Text style={styles.startBtnText}>Start verification</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
    startCard: {
      alignItems: "center",
      padding: spacing.xl,
      borderRadius: 12,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    startIcon: { marginBottom: spacing.md },
    startTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    startDesc: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: spacing.sm },
    startSteps: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xl },
    startBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    startBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
  });
}
