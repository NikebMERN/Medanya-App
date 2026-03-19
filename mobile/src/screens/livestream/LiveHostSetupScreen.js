import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useLivestreamStore } from "../../store/livestream.store";
import { useAuthStore } from "../../store/auth.store";
import { canLiveStream, getDobFromUser } from "../../utils/age";
import FeatureGuard from "../../components/guards/FeatureGuard";

export default function LiveHostSetupScreen({ navigation }) {
  return (
    <FeatureGuard
      featureName="livestream-broadcast"
      mode="block"
      variant="full"
      iconName="live-tv"
      title="Go live from the mobile app"
      message="Use the mobile app for high-quality livestreaming, better performance, and full camera support."
    >
      <LiveHostSetupScreenInner navigation={navigation} />
    </FeatureGuard>
  );
}

function LiveHostSetupScreenInner({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState("");
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [starting, setStarting] = useState(false);
  const { createStream, error } = useLivestreamStore();

  const handleStart = async () => {
    if (!canLiveStream(getDobFromUser(user))) {
      Alert.alert("Age requirement", "You must be 16 or older to host a live stream. Add your date of birth in Edit Profile.");
      return;
    }
    if (!rulesAccepted) {
      Alert.alert("Rules required", "Please accept the community rules before going live.");
      return;
    }
    setStarting(true);
    const { stream, error: err } = await createStream({ title: title.trim() || "Live", category: "" });
    setStarting(false);
    if (err) {
      Alert.alert("Cannot go live", err);
      return;
    }
    if (stream) navigation.replace("LivePlayer", { streamId: stream._id, stream, isHost: true });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Stream title (optional)</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="What's your stream about?"
        placeholderTextColor={colors.textMuted}
        maxLength={120}
      />
      <TouchableOpacity
        style={[styles.checkRow, rulesAccepted && styles.checkRowActive]}
        onPress={() => setRulesAccepted(!rulesAccepted)}
        activeOpacity={0.8}
      >
        <Text style={styles.checkText}>I accept the community rules and am 16+</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.startBtn, starting && styles.startBtnDisabled]}
        onPress={handleStart}
        disabled={starting}
        activeOpacity={0.8}
      >
        {starting ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={styles.startBtnText}>Go live</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
    label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: spacing.xs },
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
    checkRow: {
      padding: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
    },
    checkRowActive: { borderColor: colors.primary, backgroundColor: colors.primary + "10" },
    checkText: { fontSize: 14, color: colors.text },
    startBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
    },
    startBtnDisabled: { opacity: 0.7 },
    startBtnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  });
}
