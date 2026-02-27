/**
 * VideoRecordScreen — Shorts-style: back arrow only, record with camera or pick from gallery.
 * Uses ImagePicker for camera recording and gallery video pick; stores draft and goes to Edit.
 */
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useVideoCreateStore } from "../../store/videoCreate.store";

const DURATION_OPTIONS = [15, 30, 60];

// Support both assets array and legacy single-uri result from expo-image-picker
function getVideoUriAndDuration(result) {
  if (!result || result.canceled) return null;
  const asset = result.assets?.[0];
  const uri = asset?.uri ?? result.uri;
  if (!uri) return null;
  // duration can be in seconds (number) or milliseconds depending on platform/version
  let durationSec = asset?.duration ?? result.duration ?? 0;
  if (durationSec > 0 && durationSec < 1000) durationSec = durationSec; // already in seconds
  else if (durationSec >= 1000) durationSec = durationSec / 1000;
  const durationMs = Math.round(durationSec * 1000);
  return { uri, durationMs };
}

export default function VideoRecordScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const setDraft = useVideoCreateStore((s) => s.setDraft);
  const [loading, setLoading] = useState(false);
  const [maxDuration, setMaxDuration] = useState(60);

  const close = useCallback(() => navigation.goBack(), [navigation]);

  const requestCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Allow camera access to record videos.");
      return false;
    }
    return true;
  }, []);

  const startRecord = useCallback(async () => {
    if (!(await requestCamera())) return;
    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: maxDuration,
        allowsEditing: false,
      });
      const parsed = getVideoUriAndDuration(result);
      if (parsed) {
        setDraft(parsed.uri, "recorded", parsed.durationMs);
        navigation.replace("VideoEdit");
      }
    } catch (e) {
      Alert.alert("Error", e?.message ?? "Recording failed.");
    } finally {
      setLoading(false);
    }
  }, [maxDuration, requestCamera, setDraft, navigation]);

  const openGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Allow media access to pick videos.");
      return;
    }
    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: false,
        videoMaxDuration: maxDuration,
      });
      const parsed = getVideoUriAndDuration(result);
      if (parsed) {
        setDraft(parsed.uri, "gallery", parsed.durationMs);
        navigation.replace("VideoEdit");
      }
    } catch (e) {
      Alert.alert("Error", e?.message ?? "Failed to pick video.");
    } finally {
      setLoading(false);
    }
  }, [maxDuration, setDraft, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Full-area preview placeholder */}
      <View style={[styles.preview, { width, height: width * 1.6 }]}>
        <View style={styles.previewPlaceholder}>
          <MaterialIcons name="videocam" size={64} color={colors.textMuted} />
          <Text style={styles.previewLabel}>Record or choose from gallery</Text>
          <Text style={styles.previewHint}>Tap Record or Gallery below</Text>
        </View>
      </View>

      {/* Back arrow only — top left */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={close}
        activeOpacity={0.8}
      >
        <MaterialIcons name="arrow-back" size={28} color={colors.text} />
      </TouchableOpacity>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.durationChip, maxDuration === d && styles.durationChipActive]}
              onPress={() => setMaxDuration(d)}
            >
              <Text style={[styles.durationChipText, maxDuration === d && { color: colors.primary }]}>{d}s</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.recordRow}>
          <TouchableOpacity
            style={[styles.uploadBtn, loading && styles.btnDisabled]}
            onPress={openGallery}
            disabled={loading}
          >
            <MaterialIcons name="photo-library" size={28} color={colors.text} />
            <Text style={styles.uploadLabel}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.recordBtn, loading && styles.recordBtnDisabled]}
            onPress={startRecord}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={styles.recordBtnInner} />
            )}
          </TouchableOpacity>
          <View style={styles.placeholder} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#111" },
    preview: {
      alignSelf: "center",
      backgroundColor: colors.surface || "#1a1a1a",
    },
    previewPlaceholder: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    previewLabel: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
    previewHint: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    backBtn: {
      position: "absolute",
      left: spacing.md,
      top: spacing.sm,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
    },
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
      paddingHorizontal: spacing.lg,
    },
    durationRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    durationChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
    },
    durationChipActive: { backgroundColor: "rgba(255,255,255,0.3)" },
    durationChipText: { fontSize: 13, fontWeight: "600", color: colors.text },
    recordRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      maxWidth: 300,
    },
    uploadBtn: {
      width: 64,
      alignItems: "center",
      justifyContent: "center",
    },
    uploadLabel: { fontSize: 12, fontWeight: "600", color: colors.text, marginTop: 4 },
    recordBtn: {
      width: 76,
      height: 76,
      borderRadius: 38,
      borderWidth: 4,
      borderColor: "#fff",
      justifyContent: "center",
      alignItems: "center",
    },
    recordBtnDisabled: { opacity: 0.6 },
    btnDisabled: { opacity: 0.6 },
    recordBtnInner: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: "#ef4444",
    },
    placeholder: { width: 64 },
  });
}
