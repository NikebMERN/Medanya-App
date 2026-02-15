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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
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
  const [evidencePhotos, setEvidencePhotos] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      const photos = evidencePhotos
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await createReport({
        phoneNumber: phone,
        employerName: employerName.trim() || undefined,
        reason: r,
        description: description.trim() || undefined,
        locationText: locationText.trim() || undefined,
        evidence: { photos, videos: [] },
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
  }, [isLoggedIn, phoneNumber, employerName, reason, description, locationText, evidencePhotos, navigation]);

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

        <Text style={styles.label}>Evidence URLs (optional, comma-separated)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Image or video URLs"
          placeholderTextColor={colors.textMuted}
          value={evidencePhotos}
          onChangeText={setEvidencePhotos}
          multiline
        />

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
    placeholderText: { fontSize: 15, color: colors.textMuted, textAlign: "center", margin: spacing.lg },
    backBtn: { alignSelf: "center", padding: spacing.md },
    backBtnText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  });
}
