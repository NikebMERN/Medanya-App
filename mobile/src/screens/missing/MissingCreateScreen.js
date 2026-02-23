import React, { useState, useCallback, useRef, useMemo } from "react";
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
import { Audio } from "expo-av";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { uploadToCloudinary } from "../../utils/env";
import * as missingApi from "../../services/missing.api";

export default function MissingCreateScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isLoggedIn = !!useAuthStore((s) => s.token);
  const recordingRef = useRef(null);

  const [photoUrl, setPhotoUrl] = useState("");
  const [localPhotoUri, setLocalPhotoUri] = useState(null);
  const [fullName, setFullName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [lastKnownLocationText, setLastKnownLocationText] = useState("");
  const [description, setDescription] = useState("");
  const [voiceUrl, setVoiceUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickPhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission", "Allow photo library access to add a photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      setLocalPhotoUri(uri);
      setUploadingPhoto(true);
      try {
        const url = await uploadToCloudinary(uri, "image");
        setPhotoUrl(url || "");
      } catch (e) {
        Alert.alert("Upload failed", e?.message ?? "Could not upload photo.");
      } finally {
        setUploadingPhoto(false);
      }
    } catch (e) {
      Alert.alert("Error", e?.message ?? "Could not open gallery.");
    }
  }, []);

  const toggleVoice = useCallback(async () => {
    if (recording) {
      try {
        const r = recordingRef.current;
        if (r) {
          await r.stopAndUnloadAsync();
          const uri = r.getURI();
          if (uri) {
            setUploadingVoice(true);
            const url = await uploadToCloudinary(uri, "raw", "audio/m4a");
            setUploadingVoice(false);
            if (url) setVoiceUrl(url);
          }
        }
      } catch (e) {
        setUploadingVoice(false);
        Alert.alert("Voice error", e?.message ?? "Could not save voice.");
      }
      setRecording(false);
      recordingRef.current = null;
      return;
    }
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission", "Allow microphone access to record voice.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const { recording: r } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = r;
      setRecording(true);
    } catch (e) {
      Alert.alert("Recording failed", e?.message ?? "Could not start recording.");
    }
  }, [recording]);

  const handleSubmit = useCallback(async () => {
    if (!isLoggedIn) {
      Alert.alert("Login required", "Please sign in to create an alert.");
      return;
    }
    const photo = (photoUrl || "").trim();
    if (!photo) {
      Alert.alert("Required", "Please add a photo.");
      return;
    }
    const phone = (contactPhone || "").trim();
    if (!phone) {
      Alert.alert("Required", "Contact phone is required.");
      return;
    }
    const location = (lastKnownLocationText || "").trim();
    if (!location) {
      Alert.alert("Required", "Last known location is required.");
      return;
    }
    const desc = (description || "").trim();
    if (!desc) {
      Alert.alert("Required", "Description is required.");
      return;
    }
    setSubmitting(true);
    try {
      await missingApi.createMissingPerson({
        photoUrl: photo,
        fullName: fullName.trim() || undefined,
        contactPhone: phone,
        voiceUrl: voiceUrl.trim() || undefined,
        lastKnownLocationText: location,
        description: desc,
      });
      Alert.alert("Created", "Missing person alert has been created.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.error?.message || err?.message || "Failed to create alert.");
    } finally {
      setSubmitting(false);
    }
  }, [isLoggedIn, photoUrl, fullName, contactPhone, lastKnownLocationText, description, voiceUrl, navigation]);

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholderText}>Please sign in to create a missing person alert.</Text>
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
        <Text style={styles.headerTitle}>Report Missing</Text>
        <View style={styles.headerRight} />
      </View>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Photo *</Text>
        <TouchableOpacity style={styles.photoBox} onPress={pickPhoto} disabled={uploadingPhoto}>
          {localPhotoUri || photoUrl ? (
            <Image source={{ uri: localPhotoUri || photoUrl }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              {uploadingPhoto ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <>
                  <MaterialIcons name="add-a-photo" size={40} color={colors.textMuted} />
                  <Text style={styles.photoPlaceholderText}>Add photo</Text>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Voice message (optional)</Text>
        <TouchableOpacity
          style={[styles.voiceBtn, recording && styles.voiceBtnRecording]}
          onPress={toggleVoice}
          disabled={uploadingVoice}
        >
          {uploadingVoice ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <MaterialIcons name={recording ? "stop" : "mic"} size={24} color={colors.white} />
              <Text style={styles.voiceBtnText}>{recording ? "Stop" : voiceUrl ? "Re-record" : "Record"}</Text>
            </>
          )}
        </TouchableOpacity>
        {voiceUrl ? <Text style={styles.hint}>Voice message added</Text> : null}

        <Text style={styles.label}>Name (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={colors.textMuted}
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>Contact phone *</Text>
        <TextInput
          style={styles.input}
          placeholder="+971..."
          placeholderTextColor={colors.textMuted}
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Last known location *</Text>
        <TextInput
          style={styles.input}
          placeholder="Area or address"
          placeholderTextColor={colors.textMuted}
          value={lastKnownLocationText}
          onChangeText={setLastKnownLocationText}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What happened? When last seen? What were they wearing?"
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.submitBtnText}>Create Alert</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
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
    textArea: { minHeight: 100, textAlignVertical: "top" },
    photoBox: { marginBottom: spacing.sm },
    photoPreview: { width: "100%", height: 200, borderRadius: 12 },
    photoPlaceholder: {
      width: "100%",
      height: 200,
      borderRadius: 12,
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    photoPlaceholderText: { fontSize: 14, color: colors.textMuted, marginTop: spacing.sm },
    voiceBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      marginBottom: spacing.xs,
    },
    voiceBtnRecording: { backgroundColor: colors.error },
    voiceBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
    hint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
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
