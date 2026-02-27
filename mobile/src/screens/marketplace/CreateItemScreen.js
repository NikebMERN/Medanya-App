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
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { uploadToCloudinary } from "../../utils/env";
import { canUseMarketplace, getDobFromUser } from "../../utils/age";
import * as marketplaceApi from "../../services/marketplace.api";
import { CURRENCY_OPTIONS } from "../../store/jobs.store";
import { MARKETPLACE_CATEGORY_OPTIONS } from "../../store/marketplace.store";
import SubScreenHeader from "../../components/SubScreenHeader";

export default function CreateItemScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = !!useAuthStore((s) => s.token);
  const kycFaceVerified = user?.kyc_face_verified ?? user?.kycFaceVerified ?? false;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("ETB");
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [imageUrls, setImageUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const addImageFromUri = useCallback(async (uri) => {
    if (imageUrls.length >= 8) {
      Alert.alert("Limit", "Maximum 8 images.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadToCloudinary(uri, "image");
      if (url) setImageUrls((prev) => [...prev, url].slice(0, 8));
    } catch (e) {
      Alert.alert("Upload failed", e?.message ?? "Could not upload.");
    } finally {
      setUploading(false);
    }
  }, [imageUrls.length]);

  const pickImage = useCallback(async () => {
    if (imageUrls.length >= 8) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission", "Allow photo library access.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await addImageFromUri(result.assets[0].uri);
    } catch (e) {
      Alert.alert("Error", e?.message ?? "Could not open gallery.");
    }
  }, [imageUrls.length, addImageFromUri]);

  const takePhoto = useCallback(async () => {
    if (imageUrls.length >= 8) return;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission", "Allow camera access.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await addImageFromUri(result.assets[0].uri);
    } catch (e) {
      Alert.alert("Error", e?.message ?? "Could not open camera.");
    }
  }, [imageUrls.length, addImageFromUri]);

  const showPhotoOptions = useCallback(() => {
    if (uploading || imageUrls.length >= 8) return;
    Alert.alert("Add photo", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickImage },
    ]);
  }, [uploading, imageUrls.length, takePhoto, pickImage]);

  const removeImage = useCallback((index) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const accountPrivate = user?.account_private ?? user?.accountPrivate ?? false;
  const handleSubmit = useCallback(async () => {
    if (!isLoggedIn) {
      Alert.alert("Login required", "Please sign in to list an item.");
      return;
    }
    if (accountPrivate) {
      Alert.alert("Public account required", "Your account must be public to sell items. Change it in Profile → Edit Profile.");
      return;
    }
    if (!canUseMarketplace(getDobFromUser(user))) {
      Alert.alert("Age requirement", "You must be 16 or older to list items. Add your date of birth in Edit Profile.");
      return;
    }
    if (!kycFaceVerified) {
      Alert.alert(
        "Face verification required",
        "Complete identity verification and have your face matched to your document before listing items. Go to Profile → Identity Verification.",
        [{ text: "OK" }, { text: "Go to verification", onPress: () => navigation.navigate("Profile", { screen: "Kyc" }) }]
      );
      return;
    }
    const t = title.trim();
    if (!t) {
      Alert.alert("Required", "Title is required.");
      return;
    }
    const d = description.trim();
    if (!d) {
      Alert.alert("Required", "Description is required.");
      return;
    }
    const raw = category === "other" ? customCategory.trim() : category.trim();
    const c = raw.toLowerCase().replace(/\s+/g, "_").slice(0, 60);
    if (!c) {
      Alert.alert("Required", category === "other" ? "Please enter a category (e.g. Books, Crafts)." : "Category is required.");
      return;
    }
    if (category === "other" && raw.length < 2) {
      Alert.alert("Invalid", "Please enter at least 2 characters for custom category.");
      return;
    }
    const loc = location.trim();
    if (!loc) {
      Alert.alert("Required", "Location is required.");
      return;
    }
    const p = parseFloat(price, 10);
    if (!Number.isFinite(p) || p < 0) {
      Alert.alert("Required", "Enter a valid price.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await marketplaceApi.createItem({
        title: t,
        description: d,
        category: c,
        location: loc,
        price: p,
        currency: priceCurrency,
        image_urls: imageUrls.length > 0 ? imageUrls : [],
      });
      const itemId = created?.id ?? created?._id;
      const status = String(created?.status ?? "active").toLowerCase();
      const isPending = status === "pending_review";
      if (isPending && itemId) {
        Alert.alert(
          "Posted",
          "Posted. Pending safety review.",
          [
            { text: "OK", onPress: () => navigation.goBack() },
            {
              text: "View listing",
              onPress: () => navigation.replace("MarketplaceDetail", { itemId }),
            },
          ]
        );
      } else {
        const buttons = [{ text: "OK", onPress: () => navigation.goBack() }];
        if (itemId) {
          buttons.push({
            text: "View listing",
            onPress: () => navigation.replace("MarketplaceDetail", { itemId }),
          });
        }
        Alert.alert("Posted", "Posted successfully.", buttons);
      }
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      const msg = err?.response?.data?.error?.message || err?.message || "Failed to post.";
      if (code === "FORBIDDEN" && (msg || "").toLowerCase().includes("face")) {
        Alert.alert("Face verification required", msg || "Complete identity verification and have your face matched before listing items.", [{ text: "OK" }, { text: "Go to verification", onPress: () => navigation.navigate("Profile", { screen: "Kyc" }) }]);
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
  }, [isLoggedIn, accountPrivate, kycFaceVerified, title, description, category, customCategory, location, price, priceCurrency, imageUrls, navigation, user]);

  const tabNav = navigation.getParent?.() ?? navigation;
  const subHeader = (
    <SubScreenHeader
      title="Sell Item"
      onBack={() => navigation.goBack()}
      showProfileDropdown
      navigation={tabNav}
    />
  );

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        {subHeader}
        <View style={styles.center}>
          <Text style={styles.placeholderText}>Please sign in to sell an item.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!kycFaceVerified) {
    return (
      <SafeAreaView style={styles.wrapper} edges={["top"]}>
        {subHeader}
        <View style={[styles.container, styles.center]}>
          <MaterialIcons name="verified-user" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
          <Text style={styles.placeholderText}>Face verification required to list items.</Text>
          <Text style={[styles.placeholderText, { marginTop: 0, fontSize: 14 }]}>Complete Identity Verification in Profile and have your face matched to your document.</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Profile", { screen: "Kyc" })} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go to Identity Verification</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={[styles.backBtnText, { color: colors.textMuted }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!canUseMarketplace(getDobFromUser(user))) {
    return (
      <SafeAreaView style={styles.wrapper} edges={["top"]}>
        {subHeader}
        <View style={[styles.container, styles.center]}>
          <MaterialIcons name="cake" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
          <Text style={styles.placeholderText}>You must be 16 or older to list items.</Text>
          <Text style={[styles.placeholderText, { marginTop: 0, fontSize: 14 }]}>Add your date of birth in Edit Profile.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrapper} edges={["top"]}>
      {subHeader}
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.safetyHint, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
          <MaterialIcons name="shield" size={20} color={colors.primary} />
          <Text style={[styles.safetyHintText, { color: colors.text }]}>
            Safety tips: Meet in public. Don't pay upfront. Use in-app chat.
          </Text>
        </View>
        <Text style={styles.label}>Photos (optional, max 8)</Text>
        <View style={styles.imageRow}>
          {imageUrls.map((uri, i) => (
            <View key={i} style={styles.imageWrap}>
              <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(i)}>
                <MaterialIcons name="close" size={18} color={colors.white} />
              </TouchableOpacity>
            </View>
          ))}
          {imageUrls.length < 8 && (
            <TouchableOpacity style={styles.addPhoto} onPress={showPhotoOptions} disabled={uploading}>
              {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name="add-a-photo" size={32} color={colors.textMuted} />}
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} placeholder="Item title" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Description *</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Describe your item" placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} multiline numberOfLines={4} />

        <Text style={styles.label}>Category *</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setCategoryModalVisible(true)}>
          <Text style={[styles.dropdownText, !category && styles.dropdownPlaceholder]}>
            {category ? MARKETPLACE_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category : "Select category"}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        {category === "other" && (
          <TextInput
            style={[styles.input, { marginTop: spacing.sm }]}
            placeholder="Enter category (e.g. Books, Crafts, Art)"
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
                {MARKETPLACE_CATEGORY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.modalItem, category === opt.value && { backgroundColor: colors.primary + "20" }]}
                    onPress={() => {
                      setCategory(opt.value);
                      setCategoryModalVisible(false);
                      if (opt.value !== "other") setCustomCategory("");
                    }}
                  >
                    <Text style={[styles.modalItemText, { color: colors.text }]}>{opt.label}</Text>
                    {category === opt.value && <MaterialIcons name="check" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[styles.modalCloseBtn, { borderTopColor: colors.border }]} onPress={() => setCategoryModalVisible(false)}>
                <Text style={[styles.modalCloseText, { color: colors.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        <Text style={styles.label}>Location *</Text>
        <TextInput style={styles.input} placeholder="Where is the item?" placeholderTextColor={colors.textMuted} value={location} onChangeText={setLocation} />

        <Text style={styles.label}>Price *</Text>
        <View style={styles.salaryRow}>
          <TextInput
            style={[styles.input, styles.salaryInput]}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={styles.currencyBtn} onPress={() => setCurrencyModalVisible(true)}>
            <Text style={styles.currencyBtnText}>{priceCurrency}</Text>
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
                    style={[styles.modalItem, priceCurrency === opt.value && { backgroundColor: colors.primary + "20" }]}
                    onPress={() => {
                      setPriceCurrency(opt.value);
                      setCurrencyModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, { color: colors.text }]}>{opt.label}</Text>
                    {priceCurrency === opt.value && <MaterialIcons name="check" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.submitBtnText}>Post listing</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    wrapper: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background },
    center: { justifyContent: "center", alignItems: "center", padding: spacing.lg },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm },
    input: { backgroundColor: colors.surfaceLight, borderRadius: 12, padding: spacing.md, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border },
    salaryRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
    salaryInput: { flex: 1 },
    currencyBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceLight, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border, minWidth: 90 },
    currencyBtnText: { fontSize: 15, fontWeight: "600", color: colors.text, marginRight: 4 },
    textArea: { minHeight: 100, textAlignVertical: "top" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg },
    modalContent: { borderRadius: 16, maxHeight: 400 },
    modalTitle: { fontSize: 18, fontWeight: "700", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalList: { maxHeight: 300 },
    modalItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalItemText: { fontSize: 16 },
    modalCloseBtn: { paddingVertical: spacing.md, alignItems: "center", borderTopWidth: 1, marginHorizontal: spacing.lg, marginTop: spacing.sm },
    modalCloseText: { fontSize: 16, fontWeight: "600" },
    dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surfaceLight, borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
    dropdownText: { fontSize: 15, color: colors.text },
    dropdownPlaceholder: { color: colors.textMuted },
    imageRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
    imageWrap: { position: "relative" },
    thumb: { width: 80, height: 80, borderRadius: 8 },
    removeBtn: { position: "absolute", top: -4, right: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.error, justifyContent: "center", alignItems: "center" },
    addPhoto: { width: 80, height: 80, borderRadius: 8, backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    chip: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: 20, backgroundColor: colors.surfaceLight },
    chipActive: { backgroundColor: colors.primary },
    chipText: { fontSize: 13, color: colors.text },
    chipTextActive: { fontSize: 13, color: colors.white, fontWeight: "600" },
    safetyHint: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: spacing.md,
    },
    safetyHintText: { flex: 1, fontSize: 14, fontWeight: "500" },
    submitBtn: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: 12, padding: spacing.md, alignItems: "center" },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
    placeholderText: { fontSize: 15, color: colors.textMuted, textAlign: "center", margin: spacing.lg },
    backBtn: { alignSelf: "center", padding: spacing.md },
    backBtnText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  });
}
