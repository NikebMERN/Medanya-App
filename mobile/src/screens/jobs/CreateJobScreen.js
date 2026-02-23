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
  Modal,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { uploadToCloudinary } from "../../utils/env";
import { canPostJobs } from "../../utils/age";
import * as jobsApi from "../../services/jobs.api";
import { JOB_CATEGORY_OPTIONS, CURRENCY_OPTIONS } from "../../store/jobs.store";

export default function CreateJobScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = !!useAuthStore((s) => s.token);
  const kycFaceVerified = user?.kyc_face_verified ?? user?.kycFaceVerified ?? false;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [salary, setSalary] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("ETB");
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [location, setLocation] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const categoryDisplay = useMemo(() => {
    if (!category) return "";
    const opt = JOB_CATEGORY_OPTIONS.find((o) => o.value === category);
    if (opt) return opt.label;
    return category;
  }, [category]);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission", "Allow photo library access.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
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
    if (!canPostJobs(user?.dob ?? "")) {
      Alert.alert("Age requirement", "You must be 18 or older to post jobs. Add your date of birth in Edit Profile.");
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
    const c = (category === "other" ? customCategory.trim() : category.trim()).toLowerCase().replace(/\s+/g, "_");
    if (!c) {
      Alert.alert("Required", category === "other" ? "Please enter the job category." : "Category is required.");
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
      const salaryVal = salary.trim();
      const salaryDisplay = salaryVal ? `${salaryVal} ${salaryCurrency}` : undefined;
      await jobsApi.createJob({
        title: t,
        description: description.trim() || undefined,
        category: c,
        salary: salaryDisplay,
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
  }, [isLoggedIn, kycFaceVerified, title, description, category, customCategory, salary, salaryCurrency, location, contactPhone, imageUrl, navigation]);

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

          <Text style={styles.label}>Job description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the job, responsibilities, requirements..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Category *</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setCategoryModalVisible(true)}>
            <Text style={[styles.dropdownText, !category && styles.dropdownPlaceholder]}>
              {categoryDisplay || "Select category"}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          {category === "other" && (
            <TextInput
              style={[styles.input, { marginTop: spacing.sm }]}
              placeholder="Enter category (e.g. Carpenter)"
              placeholderTextColor={colors.textMuted}
              value={customCategory}
              onChangeText={setCustomCategory}
            />
          )}

          <Modal visible={categoryModalVisible} transparent animationType="fade">
            <Pressable style={styles.modalOverlay} onPress={() => setCategoryModalVisible(false)}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select category</Text>
                <ScrollView style={styles.modalList}>
                  {JOB_CATEGORY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.modalItem, category === opt.value && { backgroundColor: colors.primary + "20" }]}
                      onPress={() => {
                        setCategory(opt.value);
                        setCategoryModalVisible(false);
                      }}
                    >
                      <Text style={[styles.modalItemText, { color: colors.text }]}>{opt.label}</Text>
                      {category === opt.value && <MaterialIcons name="check" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>

          <Text style={styles.label}>Location *</Text>
          <TextInput style={styles.input} placeholder="Where is the job?" placeholderTextColor={colors.textMuted} value={location} onChangeText={setLocation} />

          <Text style={styles.label}>Salary (optional)</Text>
          <View style={styles.salaryRow}>
            <TextInput
              style={[styles.input, styles.salaryInput]}
              placeholder="e.g. 2000"
              placeholderTextColor={colors.textMuted}
              value={salary}
              onChangeText={setSalary}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.currencyBtn} onPress={() => setCurrencyModalVisible(true)}>
              <Text style={styles.currencyBtnText}>{salaryCurrency}</Text>
              <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Modal visible={currencyModalVisible} transparent animationType="fade">
            <Pressable style={styles.modalOverlay} onPress={() => setCurrencyModalVisible(false)}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select currency</Text>
                <ScrollView style={styles.modalList}>
                  {CURRENCY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.modalItem, salaryCurrency === opt.value && { backgroundColor: colors.primary + "20" }]}
                      onPress={() => {
                        setSalaryCurrency(opt.value);
                        setCurrencyModalVisible(false);
                      }}
                    >
                      <Text style={[styles.modalItemText, { color: colors.text }]}>{opt.label}</Text>
                      {salaryCurrency === opt.value && <MaterialIcons name="check" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>

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
    salaryRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
    salaryInput: { flex: 1 },
    currencyBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceLight, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border, minWidth: 90 },
    currencyBtnText: { fontSize: 15, fontWeight: "600", color: colors.text, marginRight: 4 },
    imageSlot: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, overflow: "hidden", marginBottom: spacing.sm },
    thumb: { width: "100%", height: "100%" },
    imagePlaceholder: { flex: 1, backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
    imageLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    textArea: { minHeight: 100, textAlignVertical: "top" },
    dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surfaceLight, borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
    dropdownText: { fontSize: 15, color: colors.text },
    dropdownPlaceholder: { color: colors.textMuted },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg },
    modalContent: { borderRadius: 16, maxHeight: 400 },
    modalTitle: { fontSize: 18, fontWeight: "700", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalList: { maxHeight: 300 },
    modalItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalItemText: { fontSize: 16 },
    submitBtn: { marginTop: spacing.xl, backgroundColor: colors.primary, borderRadius: 12, padding: spacing.md, alignItems: "center" },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
    placeholderText: { fontSize: 15, color: colors.textMuted, textAlign: "center", marginBottom: spacing.sm },
    backBtnText: { padding: spacing.sm },
    linkText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  });
}
