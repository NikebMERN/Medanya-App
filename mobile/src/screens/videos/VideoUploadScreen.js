import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, SafeAreaView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { uploadToCloudinary } from "../../utils/env";
import * as videosApi from "../../api/videos.api";
import { useAuthStore } from "../../store/auth.store";
import { canPostVideo, getDobFromUser } from "../../utils/age";
import GuestGate from "../../components/GuestGate";
import SubScreenHeader from "../../components/SubScreenHeader";

export default function VideoUploadScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const isGuest = user?.isGuest ?? false;
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const [videoUri, setVideoUri] = useState(null);

  if (isGuest) {
    return <GuestGate message="Sign in to upload videos" />;
  }
  const canPost = canPostVideo(getDobFromUser(user));
  const [thumbUri, setThumbUri] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const recordVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission", "Allow camera access to record videos.");
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      videoMaxDuration: 60,
      videoQuality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setVideoUri(result.assets[0].uri);
  }, []);

  const pickVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission", "Allow media access.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 1,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setVideoUri(result.assets[0].uri);
  }, []);

  const pickThumb = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission", "Allow media access.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setThumbUri(result.assets[0].uri);
  }, []);

  const submit = useCallback(async () => {
    if (!canPost) return Alert.alert("Age requirement", "You must be 16 or older to post videos. Add your date of birth in Edit Profile.");
    if (!videoUri) return Alert.alert("Required", "Select a video.");
    if (!thumbUri) return Alert.alert("Required", "Select a thumbnail image.");
    setUploading(true);
    try {
      const [videoUrl, thumbnailUrl] = await Promise.all([
        uploadToCloudinary(videoUri, "video"),
        uploadToCloudinary(thumbUri, "image"),
      ]);
      const video = await videosApi.createVideo({ videoUrl, thumbnailUrl, caption });
      Alert.alert("Uploaded", "Video submitted.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || "Upload failed";
      const code = e?.response?.data?.error?.code;
      if (code === "AGE_REQUIRED" || (msg && /date of birth|dob|age/i.test(msg))) {
        Alert.alert("Age requirement", "Add your date of birth in Edit Profile to post videos.");
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setUploading(false);
    }
  }, [videoUri, thumbUri, caption, navigation, canPost]);

  const tabNav = navigation.getParent?.() ?? navigation;

  if (!canPost) {
    return (
      <View style={styles.container}>
        <SubScreenHeader title="Create Video" onBack={() => navigation.goBack()} showProfileDropdown navigation={tabNav} />
        <View style={[styles.content, { justifyContent: "center", alignItems: "center", padding: 24 }]}>
          <MaterialIcons name="cake" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={[styles.label, { textAlign: "center", marginBottom: 8 }]}>Age requirement</Text>
          <Text style={{ color: colors.textMuted, textAlign: "center", marginBottom: 16, fontSize: 14 }}>
            You must be 16 or older to post videos. Add your date of birth in Edit Profile.
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 12 }}>
            <Text style={{ color: colors.textMuted }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SubScreenHeader
        title="Create Video"
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={tabNav}
      />

      <View style={styles.content}>
        <TouchableOpacity style={styles.pickBtn} onPress={recordVideo}>
          <MaterialIcons name="videocam" size={22} color={colors.text} />
          <Text style={styles.pickText}>{videoUri ? "Re-record" : "Record video"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickBtn} onPress={pickVideo}>
          <MaterialIcons name="video-library" size={22} color={colors.text} />
          <Text style={styles.pickText}>{videoUri ? "Change video" : "Pick from gallery"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.pickBtn} onPress={pickThumb}>
          <MaterialIcons name="image" size={22} color={colors.text} />
          <Text style={styles.pickText}>{thumbUri ? "Change thumbnail" : "Pick thumbnail"}</Text>
        </TouchableOpacity>

        {thumbUri ? <Image source={{ uri: thumbUri }} style={styles.thumb} /> : null}

        <Text style={styles.label}>Caption</Text>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Say something..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <TouchableOpacity style={[styles.submitBtn, uploading && styles.disabled]} onPress={submit} disabled={uploading}>
          {uploading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.submitText}>Submit</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors, paddingTop = 0) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.md },
    pickBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    pickText: { color: colors.text, fontWeight: "700" },
    thumb: { width: "100%", height: 200, borderRadius: 12, backgroundColor: colors.surfaceLight },
    label: { color: colors.textSecondary, fontWeight: "700" },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surfaceLight, padding: spacing.md, color: colors.text },
    submitBtn: { marginTop: spacing.md, backgroundColor: colors.primary, padding: spacing.md, borderRadius: 12, alignItems: "center" },
    submitText: { color: colors.white, fontWeight: "800" },
    disabled: { opacity: 0.7 },
  });
}

