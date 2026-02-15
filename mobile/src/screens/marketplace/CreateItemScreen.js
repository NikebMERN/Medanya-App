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
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { uploadToCloudinary } from "../../utils/env";
import * as marketplaceApi from "../../services/marketplace.api";

const CATEGORIES = ["electronics", "furniture", "clothing", "other"];

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
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrls, setImageUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = useCallback(async () => {
    if (imageUrls.length >= 8) {
      Alert.alert("Limit", "Maximum 8 images.");
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission", "Allow photo library access.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setUploading(true);
      try {
        const url = await uploadToCloudinary(result.assets[0].uri, "image");
        if (url) setImageUrls((prev) => [...prev, url].slice(0, 8));
      } catch (e) {
        Alert.alert("Upload failed", e?.message ?? "Could not upload.");
      } finally {
        setUploading(false);
      }
    } catch (e) {
      Alert.alert("Error", e?.message ?? "Could not open gallery.");
    }
  }, [imageUrls.length]);

  const removeImage = useCallback((index) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isLoggedIn) {
      Alert.alert("Login required", "Please sign in to list an item.");
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
    const p = parseFloat(price, 10);
    if (!Number.isFinite(p) || p < 0) {
      Alert.alert("Required", "Enter a valid price.");
      return;
    }
    setSubmitting(true);
    try {
      await marketplaceApi.createItem({
        title: t,
        description: d,
        category: c,
        location: loc,
        price: p,
        image_urls: imageUrls.length > 0 ? imageUrls : [],
      });
      Alert.alert("Posted", "Your item has been listed.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
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
  }, [isLoggedIn, kycFaceVerified, title, description, category, location, price, imageUrls, navigation]);

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholderText}>Please sign in to sell an item.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!kycFaceVerified) {
    return (
      <SafeAreaView style={styles.wrapper} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sell Item</Text>
          <View style={styles.headerRight} />
        </View>
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

  return (
    <SafeAreaView style={styles.wrapper} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sell Item</Text>
        <View style={styles.headerRight} />
      </View>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
            <TouchableOpacity style={styles.addPhoto} onPress={pickImage} disabled={uploading}>
              {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name="add-a-photo" size={32} color={colors.textMuted} />}
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} placeholder="Item title" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Description *</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Describe your item" placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} multiline numberOfLines={4} />

        <Text style={styles.label}>Category *</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Location *</Text>
        <TextInput style={styles.input} placeholder="Where is the item?" placeholderTextColor={colors.textMuted} value={location} onChangeText={setLocation} />

        <Text style={styles.label}>Price (AED) *</Text>
        <TextInput style={styles.input} placeholder="0" placeholderTextColor={colors.textMuted} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />

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
    header: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { padding: spacing.sm },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
    headerRight: { width: 40 },
    container: { flex: 1, backgroundColor: colors.background },
    center: { justifyContent: "center", alignItems: "center", padding: spacing.lg },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm },
    input: { backgroundColor: colors.surfaceLight, borderRadius: 12, padding: spacing.md, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border },
    textArea: { minHeight: 100, textAlignVertical: "top" },
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
    submitBtn: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: 12, padding: spacing.md, alignItems: "center" },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
    placeholderText: { fontSize: 15, color: colors.textMuted, textAlign: "center", margin: spacing.lg },
    backBtn: { alignSelf: "center", padding: spacing.md },
    backBtnText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  });
}
