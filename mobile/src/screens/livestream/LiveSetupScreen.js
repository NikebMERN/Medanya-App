/**
 * LiveSetupScreen — Go Live setup: title, category, cover, rules reminder (must accept).
 * OTP verified + 16+ required to host. Start Live -> createStream -> LiveHostScreen.
 */
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { useLivestreamStore } from "../../store/livestream.store";
import { canLiveStreamHost, getDobFromUser } from "../../utils/age";
import SubScreenHeader from "../../components/SubScreenHeader";

const CATEGORIES = [
  { id: "community", label: "Community Talk" },
  { id: "safety", label: "Safety" },
  { id: "jobs", label: "Jobs Advice" },
  { id: "missing", label: "Missing Alerts" },
];

const RULES_TEXT = [
  "No nudity, no gore, no hate speech.",
  "No scams or fraudulent content.",
  "Violations will cause stream stop and may result in bans.",
  "You must be 16+ to host a live stream.",
];

export default function LiveSetupScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  const user = useAuthStore((s) => s.user);
  const otpVerified = !!(user?.otp_verified ?? user?.otpVerified);
  const dob = getDobFromUser(user);
  const canHost = canLiveStreamHost(dob);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("community");
  const [coverUri, setCoverUri] = useState(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [rulesModalVisible, setRulesModalVisible] = useState(false);
  const [starting, setStarting] = useState(false);

  const createStream = useLivestreamStore((s) => s.createStream);

  const pickCover = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Allow photo access to pick a cover image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setCoverUri(result.assets[0].uri);
  }, []);

  const takeCoverPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Allow camera access to take a cover photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setCoverUri(result.assets[0].uri);
  }, []);

  const showCoverPhotoOptions = useCallback(() => {
    Alert.alert("Cover image", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Take Photo", onPress: takeCoverPhoto },
      { text: "Choose from Library", onPress: pickCover },
    ]);
  }, [takeCoverPhoto, pickCover]);

  const handleStart = useCallback(async () => {
    if (!otpVerified) {
      Alert.alert("Verification required", "You must verify your phone (OTP) to go live.");
      return;
    }
    if (!canHost) {
      Alert.alert("Age requirement", "You must be 16 or older to host a live stream. Add your date of birth in Edit Profile.");
      return;
    }
    if (!rulesAccepted) {
      setRulesModalVisible(true);
      return;
    }
    setStarting(true);
    const { stream, error: err } = await createStream({
      title: title.trim() || "Live",
      category,
    });
    setStarting(false);
    if (err) {
      Alert.alert("Cannot go live", err);
      return;
    }
    if (stream) {
      navigation.replace("LiveHost", { streamId: stream._id, stream });
    }
  }, [otpVerified, canHost, rulesAccepted, title, category, coverUri, createStream, navigation]);

  const tabNav = navigation.getParent?.() ?? navigation;
  return (
    <View style={styles.container}>
      <SubScreenHeader
        title="Go Live"
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={tabNav}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Stream title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="What's your stream about?"
          placeholderTextColor={colors.textMuted}
          maxLength={120}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.categoryChip, category === c.id && styles.categoryChipActive]}
              onPress={() => setCategory(c.id)}
            >
              <Text style={[styles.categoryChipText, category === c.id && { color: colors.primary }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Cover image (optional)</Text>
        <TouchableOpacity style={styles.coverBtn} onPress={showCoverPhotoOptions} activeOpacity={0.8}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <MaterialIcons name="add-photo-alternate" size={40} color={colors.textMuted} />
              <Text style={styles.coverPlaceholderText}>Add cover</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rulesRow, rulesAccepted && styles.rulesRowActive]}
          onPress={() => setRulesModalVisible(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name={rulesAccepted ? "check-circle" : "radio-button-unchecked"}
            size={24}
            color={rulesAccepted ? colors.primary : colors.textMuted}
          />
          <Text style={styles.rulesRowText}>I accept the community rules (tap to read)</Text>
        </TouchableOpacity>

        {!rulesAccepted && (
          <TouchableOpacity style={styles.showRulesBtn} onPress={() => setRulesModalVisible(true)}>
            <Text style={styles.showRulesBtnText}>Read rules</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.startBtn, starting && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={starting}
          activeOpacity={0.8}
        >
          {starting ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.startBtnText}>Start Live</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={rulesModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setRulesModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Community rules</Text>
            {RULES_TEXT.map((line, i) => (
              <Text key={i} style={[styles.modalRule, { color: colors.textSecondary }]}>{line}</Text>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRulesModalVisible(false)}>
                <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalAcceptBtn, { backgroundColor: colors.primary }]}
                onPress={() => { setRulesAccepted(true); setRulesModalVisible(false); }}
              >
                <Text style={styles.modalAcceptText}>I accept</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors, insets) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl },
    label: { fontSize: 12, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.xs },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
      marginBottom: spacing.lg,
    },
    categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
    categoryChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12, backgroundColor: colors.surfaceLight },
    categoryChipActive: { backgroundColor: colors.primary + "20", borderWidth: 1, borderColor: colors.primary },
    categoryChipText: { fontSize: 14, fontWeight: "600", color: colors.text },
    coverBtn: { marginBottom: spacing.lg, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
    coverImage: { width: "100%", height: 160 },
    coverPlaceholder: { width: "100%", height: 160, backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    coverPlaceholderText: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
    rulesRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.sm,
    },
    rulesRowActive: { borderColor: colors.primary, backgroundColor: colors.primary + "10" },
    rulesRowText: { flex: 1, fontSize: 14, color: colors.text },
    showRulesBtn: { alignSelf: "flex-start", marginBottom: spacing.lg },
    showRulesBtnText: { fontSize: 14, fontWeight: "600", color: colors.primary },
    startBtn: {
      backgroundColor: colors.error || "#ef4444",
      borderRadius: 12,
      paddingVertical: spacing.md,
      alignItems: "center",
      marginTop: spacing.md,
    },
    startBtnDisabled: { opacity: 0.7 },
    startBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg },
    modalContent: { borderRadius: 16, padding: spacing.lg },
    modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: spacing.md },
    modalRule: { fontSize: 14, marginBottom: spacing.xs },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.md, marginTop: spacing.lg },
    modalCancelBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    modalCancelText: { fontSize: 16 },
    modalAcceptBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: 12 },
    modalAcceptText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  });
}
