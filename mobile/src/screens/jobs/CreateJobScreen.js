import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { uploadToCloudinary } from "../../utils/env";
import * as jobsApi from "../../services/jobs.api";
import { JOB_CATEGORIES } from "../../store/jobs.store";

const CATEGORIES = JOB_CATEGORIES.filter((c) => c.value).map((c) => c.value);

export default function CreateJobScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = !!useAuthStore((s) => s.token);
  const kycFaceVerified = user?.kyc_face_verified ?? user?.kycFaceVerified ?? false;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [salary, setSalary] = useState("");
  const [location, setLocation] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission", "Allow photo library access.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? "images",
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setUploading(true);
      try {
        const url = await uploadToCloudinary(result.assets[0].uri, "image");
        if (url) setImageUrl(url);
      } catch (e) {
        Alert.alert("Upload failed", e?.message ?? "Could not upload.");
      } finally {
        setUploading(false);
      }
    } catch (e) {
      Alert.alert("Error", e?.message ?? "Could not open gallery.");
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isLoggedIn) {
      Alert.alert("Login required", "Please sign in to post a job.");
      return;
    }
    if (!kycFaceVerified) {
      Alert.alert(
        "Face verification required",
        "Complete identity verification and have your face matched to your document before posting jobs. Go to Profile → Identity Verification.",
        [{ text: "OK" }, { text: "Go to verification", onPress: () => navigation.navigate("Profile", { screen: "Kyc" }) }]
      );
      return;
    }
    const t = title.trim();
    if (!t) {
      Alert.alert("Required", "Job title is required.");
      return;
    }
    const c = category.trim();
    if (!c) {
      Alert.alert("Required", "Category is required.");
      return;
    }
    const loc = location.trim();
    if (!loc) {
      Alert.alert("Required", "Location is required.");
      return;
    }
    const phone = contactPhone.trim();
    if (!phone) {
      Alert.alert("Required", "Contact phone is required.");
      return;
    }
    setSubmitting(true);
    try {
      await jobsApi.createJob({
        title: t,
        category: c,
        salary: salary.trim() || undefined,
        location: loc,
        contact_phone: phone,
        image_url: imageUrl,
      });
      Alert.alert("Posted", "Your job has been listed.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      const msg = err?.response?.data?.error?.message || err?.message || "Failed to post.";
      if (code === "FORBIDDEN" && (msg || "").toLowerCase().includes("face")) {
        Alert.alert("Face verification required", msg || "Complete identity verification and have your face matched before posting jobs.", [{ text: "OK" }, { text: "Go to verification", onPress: () => navigation.navigate("Profile", { screen: "Kyc" }) }]);
      } else if (code === "OTP_REQUIRED") {
        Alert.alert("Verification required", "Please verify your phone number with OTP before posting.");
      } else if (code === "RATE_LIMIT") {
        Alert.alert("Rate limit", "You've reached your daily posting limit. Try again tomorrow.");
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setSubmitting(false);
    }
  }, [isLoggedIn, kycFaceVerified, title, category, salary, location, contactPhone, imageUrl, navigation]);

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Job</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.center}>
          <Text style={styles.placeholderText}>Please sign in to post a job.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnText}>
            <Text style={styles.linkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!kycFaceVerified) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Job</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.center}>
          <MaterialIcons name="verified-user" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
          <Text style={styles.placeholderText}>Face verification required to post jobs.</Text>
          <Text style={[styles.placeholderText, { marginTop: 0, fontSize: 14 }]}>Complete Identity Verification in Profile and have your face matched to your document.</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Profile", { screen: "Kyc" })} style={styles.backBtnText}>
            <Text style={styles.linkText}>Go to Identity Verification</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnText}>
            <Text style={[styles.linkText, { color: colors.textMuted }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Job</Text>
        <View style={styles.headerRight} />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Photo (optional)</Text>
          <TouchableOpacity style={styles.imageSlot} onPress={pickImage} disabled={uploading}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.thumb} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name="add-a-photo" size={32} color={colors.textMuted} />}
                <Text style={styles.imageLabel}>Add photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Job title *</Text>
          <TextInput style={styles.input} placeholder="e.g. Driver needed" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />

          <Text style={styles.label}>Category *</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Location *</Text>
          <TextInput style={styles.input} placeholder="Where is the job?" placeholderTextColor={colors.textMuted} value={location} onChangeText={setLocation} />

          <Text style={styles.label}>Salary (optional)</Text>
          <TextInput style={styles.input} placeholder="e.g. 2000 AED" placeholderTextColor={colors.textMuted} value={salary} onChangeText={setSalary} />

          <Text style={styles.label}>Contact phone *</Text>
          <TextInput style={styles.input} placeholder="+971..." placeholderTextColor={colors.textMuted} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />

          <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.submitBtnText}>Post job</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(colors, paddingTop) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, paddingHorizontal: spacing.sm, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { padding: spacing.sm },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
    headerRight: { width: 40 },
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
    label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm },
    input: { backgroundColor: colors.surfaceLight, borderRadius: 12, padding: spacing.md, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border },
    imageSlot: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, overflow: "hidden", marginBottom: spacing.sm },
    thumb: { width: "100%", height: "100%" },
    imagePlaceholder: { flex: 1, backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
    imageLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    chip: { paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: 20, backgroundColor: colors.surfaceLight },
    chipActive: { backgroundColor: colors.primary },
    chipText: { fontSize: 14, color: colors.text },
    chipTextActive: { fontSize: 14, color: colors.white, fontWeight: "600" },
    submitBtn: { marginTop: spacing.xl, backgroundColor: colors.primary, borderRadius: 12, padding: spacing.md, alignItems: "center" },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
    placeholderText: { fontSize: 15, color: colors.textMuted, textAlign: "center", marginBottom: spacing.sm },
    backBtnText: { padding: spacing.sm },
    linkText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  });
}
