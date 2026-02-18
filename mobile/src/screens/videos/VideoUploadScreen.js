import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image } from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { uploadToCloudinary } from "../../utils/env";
import * as videosApi from "../../api/videos.api";

export default function VideoUploadScreen({ navigation }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [videoUri, setVideoUri] = useState(null);
  const [thumbUri, setThumbUri] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const pickVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission", "Allow media access.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Videos ?? "videos",
      quality: 1,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setVideoUri(result.assets[0].uri);
  }, []);

  const pickThumb = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission", "Allow media access.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? "images",
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setThumbUri(result.assets[0].uri);
  }, []);

  const submit = useCallback(async () => {
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
      Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [videoUri, thumbUri, caption, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Upload Video</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.pickBtn} onPress={pickVideo}>
          <MaterialIcons name="video-library" size={22} color={colors.text} />
          <Text style={styles.pickText}>{videoUri ? "Change video" : "Pick video"}</Text>
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

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    iconBtn: { padding: spacing.sm, width: 44 },
    title: { color: colors.text, fontSize: 16, fontWeight: "800" },
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

