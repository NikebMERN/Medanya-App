import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Logo from "../../components/ui/Logo";
import Button from "../../components/ui/Button";
import { useAuthStore } from "../../store/auth.store";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { isOtpCode } from "../../utils/validators";

const RESEND_COOLDOWN = 60;
const OTP_LENGTH = 6;

export default function OtpScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useThemeColors();
  const phone = route.params?.phone || "";
  const setAuth = useAuthStore((s) => s.setAuth);
  const inputRefs = useRef([]);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendSec, setResendSec] = useState(0);

  const canConfirm = isOtpCode(code);

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setTimeout(() => setResendSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendSec]);

  const handleConfirm = async () => {
    if (!canConfirm) {
      setError("Enter the 6-digit code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { verifyOtp } = await import("../../api/auth.api");
      const res = await verifyOtp(phone, code.replace(/\D/g, ""));
      if (res.token && res.user) {
        setAuth(res.token, res.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSec > 0) return;
    setError("");
    setLoading(true);
    try {
      const { sendOtp } = await import("../../api/auth.api");
      await sendOtp(phone);
      setResendSec(RESEND_COOLDOWN);
    } catch (err) {
      setError(err.response?.data?.message || "Resend failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <Logo small />

      <Text style={styles.screenTitle}>Verify Phone</Text>
      <Text style={styles.hint}>We sent a code to {phone || "+971 *******"}</Text>

      <View style={styles.otpRow}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <TextInput
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            style={styles.otpBox}
            value={code[i] || ""}
            onChangeText={(t) => {
              const digit = t.replace(/\D/g, "").slice(-1);
              if (digit) {
                const next = (code.slice(0, i) + digit + code.slice(i + 1)).slice(0, OTP_LENGTH);
                setCode(next);
                setError("");
                if (i < OTP_LENGTH - 1) {
                  inputRefs.current[i + 1]?.focus();
                }
              } else {
                const next = code.slice(0, i) + code.slice(i + 1);
                setCode(next);
                setError("");
                if (i > 0) {
                  inputRefs.current[i - 1]?.focus();
                }
              }
            }}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === "Backspace" && !code[i] && i > 0) {
                inputRefs.current[i - 1]?.focus();
              }
            }}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title="CONFIRM VERIFICATION"
        onPress={handleConfirm}
        loading={loading}
        style={styles.submitBtn}
      />

      <TouchableOpacity
        style={[styles.resendWrap, resendSec > 0 && styles.resendDisabled]}
        onPress={handleResend}
        disabled={resendSec > 0}
      >
        <Text style={styles.resendText}>
          Resend code {resendSec > 0 ? `(${resendSec}s)` : ""}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
  },
  backBtn: {
    position: "absolute",
    left: spacing.md,
    top: 60,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  backArrow: { color: colors.text, fontSize: 22, fontWeight: "600" },
  screenTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  submitBtn: { marginTop: spacing.md },
  resendWrap: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  resendDisabled: { opacity: 0.6 },
  resendText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  });
}
