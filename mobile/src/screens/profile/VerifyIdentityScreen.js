/**
 * Provider KYC verification screen (Veriff or Sumsub).
 * Launches SDK with sessionUrl (Veriff) or accessToken (Sumsub), polls status on return.
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import * as kycApi from "../../api/kyc.api";
import SubScreenHeader from "../../components/SubScreenHeader";
import { useAuthStore } from "../../store/auth.store";

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 36; // ~90 seconds

export default function VerifyIdentityScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { provider, sessionUrl, accessToken, applicantId, mode } = route.params || {};
  const isWaitingOnly = mode === "waiting";
  const isVerifiedOnly = mode === "verified";
  const [phase, setPhase] = useState(isVerifiedOnly ? "verified" : isWaitingOnly ? "polling" : "launching");
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const pollAttempts = useRef(0);
  const pollTimer = useRef(null);

  const pollStatus = useCallback(async (trySyncFirst = false) => {
    try {
      if (provider === "VERIFF" && trySyncFirst) {
        try {
          const syncRes = await kycApi.veriffSync();
          console.log("[Veriff] veriffSync response:", syncRes, "kycStatus:", syncRes?.kycStatus);
          if (syncRes?.updated && syncRes?.kycStatus) {
            useAuthStore.getState().updateUser({ kyc_status: syncRes.kycStatus, kycStatus: syncRes.kycStatus });
            if (["verified", "verified_auto", "verified_manual"].includes(syncRes.kycStatus)) {
              const data = await kycApi.getKycStatus();
              setStatus(data);
              setPhase("verified");
              return true;
            }
            if (syncRes.kycStatus === "rejected") {
              const data = await kycApi.getKycStatus();
              setStatus(data);
              setPhase("rejected");
              return true;
            }
          }
        } catch (_) {}
      }
      const data = await kycApi.getKycStatus();
      console.log("[Veriff] getKycStatus response:", data, "kycStatus:", data?.kycStatus ?? data?.kyc_status);
      setStatus(data);
      useAuthStore.getState().updateUser({ kyc_status: data?.kycStatus, kycStatus: data?.kycStatus });
      const kycStatus = data?.kycStatus || "none";
      if (kycStatus === "verified" || kycStatus === "verified_auto" || kycStatus === "verified_manual") {
        setPhase("verified");
        return true;
      }
      if (kycStatus === "rejected") {
        setPhase("rejected");
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [provider]);

  const startPolling = useCallback(() => {
    setPhase("polling");
    pollAttempts.current = 0;
    const run = async () => {
      if (pollAttempts.current >= POLL_MAX_ATTEMPTS) {
        setPhase("timeout");
        return;
      }
      const trySyncFirst = pollAttempts.current === 0;
      const done = await pollStatus(trySyncFirst);
      if (done) return;
      pollAttempts.current += 1;
      const delay = pollAttempts.current <= 3 ? 1500 : POLL_INTERVAL_MS;
      pollTimer.current = setTimeout(run, delay);
    };
    run();
  }, [pollStatus]);

  const launchVeriff = useCallback(async () => {
    if (!sessionUrl) {
      setError("Missing session URL");
      return;
    }
    try {
      const VeriffSdk = (await import("@veriff/react-native-sdk")).default;
      if (!VeriffSdk || !VeriffSdk.launchVeriff) {
        const WebBrowser = await import("expo-web-browser");
        await WebBrowser.openBrowserAsync(sessionUrl, { createTask: false });
        startPolling();
        return;
      }
      await VeriffSdk.launchVeriff({ sessionUrl, branding: {} });
      startPolling();
    } catch (e) {
      const msg = e?.message || String(e);
      if (/null|not found|cannot find|Unable to resolve/i.test(msg)) {
        try {
          const WebBrowser = await import("expo-web-browser");
          await WebBrowser.openBrowserAsync(sessionUrl, { createTask: false });
          startPolling();
        } catch (wbErr) {
          setError("Unable to open verification. Try a development build with native modules.");
        }
      } else {
        setError(msg);
      }
    }
  }, [sessionUrl, startPolling]);

  const launchSumsub = useCallback(async () => {
    if (!accessToken) {
      setError("Missing access token");
      return;
    }
    try {
      const { default: SumsubSDK } = await import("@sumsub/react-native-mobilesdk-module");
      await SumsubSDK.init({ accessToken });
      await SumsubSDK.launch();
      startPolling();
    } catch (e) {
      const msg = e?.message || String(e);
      if (/not found|cannot find|Unable to resolve/i.test(msg)) {
        setError("Sumsub SDK not installed. Run: npx expo install @sumsub/react-native-mobilesdk-module");
      } else {
        setError(msg);
      }
    }
  }, [accessToken, startPolling]);

  useEffect(() => {
    if (isWaitingOnly || isVerifiedOnly) return;
    if (provider === "VERIFF" && sessionUrl) {
      launchVeriff();
    } else if (provider === "SUMSUB" && accessToken) {
      launchSumsub();
    } else {
      setError("Invalid verification params");
    }
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  const handleRetry = () => {
    setPhase("launching");
    setError(null);
    setStatus(null);
    if (provider === "VERIFF") launchVeriff();
    else if (provider === "SUMSUB") launchSumsub();
  };

  const handleRefresh = useCallback(async () => {
    const done = await pollStatus(true);
    if (done) return;
  }, [pollStatus]);

  const tabNav = navigation.getParent?.() ?? navigation;

  if (phase === "verified") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <SubScreenHeader title="Verification" onBack={() => navigation.goBack()} showProfileDropdown navigation={tabNav} />
        <View style={styles.center}>
          <MaterialIcons name="verified" size={64} color={colors.success} />
          <Text style={styles.title}>Identity Verified</Text>
          <Text style={styles.subtitle}>Your identity has been successfully verified.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.popToTop()}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === "rejected") {
    const reason = String(status?.lastReason || status?.latestSubmission?.reject_reason || "Verification was declined.");
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <SubScreenHeader title="Verification" onBack={() => navigation.goBack()} showProfileDropdown navigation={tabNav} />
        <View style={styles.center}>
          <MaterialIcons name="cancel" size={64} color={colors.error} />
          <Text style={styles.title}>Verification Rejected</Text>
          <Text style={styles.subtitle}>{reason}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleRetry}>
            <Text style={styles.primaryBtnText}>Retry Verification</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === "timeout") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <SubScreenHeader title="Verification" onBack={() => navigation.goBack()} showProfileDropdown navigation={tabNav} />
        <View style={styles.center}>
          <MaterialIcons name="schedule" size={64} color={colors.warning} />
          <Text style={styles.title}>Verification in Progress</Text>
          <Text style={styles.subtitle}>Results may take a few minutes. Check back shortly.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleRefresh}>
            <Text style={styles.primaryBtnText}>Check status</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <SubScreenHeader title="Verification" onBack={() => navigation.goBack()} showProfileDropdown navigation={tabNav} />
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={64} color={colors.error} />
          <Text style={styles.title}>Error</Text>
          <Text style={styles.subtitle}>{error != null ? String(error) : ""}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubScreenHeader title="Verification" onBack={() => navigation.goBack()} showProfileDropdown navigation={tabNav} />
      <View style={styles.center}>
        <MaterialIcons name="schedule" size={64} color={colors.primary} />
        <Text style={styles.title}>
          {phase === "polling" ? "Verification submitted" : "Opening verification…"}
        </Text>
        <Text style={styles.subtitle}>
          Your profile will be verified within one business day. You don't need to wait the full day—you may be verified at any time once the system finishes processing. Check your status anytime from Identity Verification.
        </Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleRefresh}>
          <Text style={styles.secondaryBtnText}>Check status</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
    title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: spacing.sm, textAlign: "center" },
    subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: "center", marginBottom: spacing.xl },
    primaryBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
    primaryBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
    secondaryBtn: { paddingVertical: spacing.sm },
    secondaryBtnText: { fontSize: 15, fontWeight: "600", color: colors.textMuted },
  });
}
