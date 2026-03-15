import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Logo from "../../components/ui/Logo";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { isValidPhone } from "../../utils/validators";
import { COUNTRY_CODES, DEFAULT_COUNTRY as DEFAULT_COUNTRY_DATA } from "../../data/countryCodes";
import { webModalOverlay, webModalContent, webScreenContainer } from "../../theme/webLayout";

export default function PhoneScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY_DATA);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);

  const fullPhone = phone.trim()
    ? `${country.code} ${phone.replace(/\D/g, "").trim()}`
    : "";
  const fullPhoneE164 = fullPhone.replace(/\s/g, "");
  const canSend = isValidPhone(fullPhone);

  const handleRequestOtp = async () => {
    if (!canSend) {
      setError("Enter a valid phone number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { sendOtp } = await import("../../api/auth.api");
      await sendOtp(fullPhoneE164);
      navigation.navigate("Otp", { phone: fullPhoneE164, country });
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg) {
        setError(msg);
      } else if (err.code === "ERR_NETWORK" || err.message?.includes("Network")) {
        setError("Cannot reach server. Use your PC IP (e.g. 192.168.x.x:4001) in .env as EXPO_PUBLIC_API_URL and ensure the backend is running.");
      } else {
        setError(err.message || "Failed to send OTP. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const openCountryPicker = () => setCountryPickerVisible(true);
  const closeCountryPicker = () => setCountryPickerVisible(false);
  const selectCountry = (item) => {
    setCountry(item);
    closeCountryPicker();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, webScreenContainer]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Logo small />

        <TouchableOpacity
          style={styles.countryCodeTouchable}
          onPress={openCountryPicker}
          activeOpacity={0.7}
        >
          <Text style={styles.countryCodeLabel}>COUNTRY CODE</Text>
          <View style={styles.countryCodeValue}>
            <Text style={styles.countryCodeFlag}>{country.flag}</Text>
            <Text style={styles.countryCodeText}>{country.code}</Text>
            <Text style={styles.countryChevron}>▼</Text>
          </View>
        </TouchableOpacity>

        <Input
          label="YOUR PHONE NUMBER"
          value={phone}
          onChangeText={(t) => {
            setPhone(t.replace(/\D/g, "").slice(0, 15));
            setError("");
          }}
          placeholder="52 123 4567"
          keyboardType="phone-pad"
          onSubmit={handleRequestOtp}
          leftComponent={
            <Text style={styles.inputCountryCode}>{country.code}</Text>
          }
          rightComponent={<Text style={styles.phoneIcon}>📞</Text>}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title={loading ? "SENDING…" : "REQUEST OTP  →"}
          onPress={handleRequestOtp}
          loading={loading}
          style={styles.submitBtn}
        />
        {loading ? (
          <Text style={styles.sendingHint}>
            Sending code to your phone. This may take a few seconds.
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By joining, you agree to our{" "}
            <Text style={styles.link}>Community Terms</Text> and{" "}
            <Text style={styles.link}>Safety Guidelines</Text>.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={countryPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={closeCountryPicker}
      >
        <View style={[styles.modalOverlay, webModalOverlay]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeCountryPicker} />
          <View style={[styles.modalContent, webModalContent]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select country code</Text>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => `${item.code}-${item.country}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryRow,
                    item.code === country.code && styles.countryRowSelected,
                  ]}
                  onPress={() => selectCountry(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.countryRowFlag}>{item.flag}</Text>
                  <Text style={styles.countryRowCode}>{item.code}</Text>
                  <Text style={styles.countryRowName} numberOfLines={1}>
                    {item.country}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.countryList}
              showsVerticalScrollIndicator={true}
            />
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={closeCountryPicker}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backBtn: {
    position: "absolute",
    left: spacing.md,
    top: 56,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  backArrow: { color: colors.text, fontSize: 22, fontWeight: "600" },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  phoneIcon: { fontSize: 18, opacity: 0.7 },
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
  socialRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleBtn: { backgroundColor: colors.surface },
  facebookBtn: { backgroundColor: "#1877f2" },
  socialIcon: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  socialLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  facebookLabel: { color: colors.white },
  facebookIcon: { color: colors.white },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 12,
    marginHorizontal: spacing.sm,
  },
  countryCodeTouchable: {
    marginBottom: spacing.md,
  },
  countryCodeLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  countryCodeValue: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  countryCodeFlag: { fontSize: 24, lineHeight: 28 },
  countryCodeText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  countryChevron: {
    color: colors.textMuted,
    fontSize: 10,
    marginLeft: "auto",
  },
  inputCountryCode: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  sendingHint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  submitBtn: { marginTop: spacing.md },
  footer: {
    marginTop: "auto",
    paddingTop: spacing.xl,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  link: { color: colors.primary, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: spacing.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  countryList: {
    maxHeight: 320,
    paddingHorizontal: spacing.lg,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    gap: spacing.sm,
  },
  countryRowSelected: {
    backgroundColor: colors.primary + "20",
  },
  countryRowFlag: { fontSize: 24, lineHeight: 28 },
  countryRowCode: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    minWidth: 48,
  },
  countryRowName: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 15,
  },
  modalCloseBtn: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  modalCloseText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  });
}
