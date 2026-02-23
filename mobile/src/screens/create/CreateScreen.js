import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { canPostVideo, canPostJobs } from "../../utils/age";

export default function CreateScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const dob = user?.dob ?? "";
  const kycFaceVerified = user?.kyc_face_verified ?? user?.kycFaceVerified ?? false;
  const canVideo = canPostVideo(dob) || canPostJobs(dob) || kycFaceVerified;
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  const close = () => navigation.goBack();

  const navVideo = () => {
    if (!canVideo) {
      Alert.alert("Age requirement", "You must be 16+ (or 18+ with verified identity) to post videos. Add your date of birth in Edit Profile or complete Identity Verification.");
      return;
    }
    close();
    navigation.navigate("VideoCreate");
  };

  const navLive = () => {
    if (!canVideo) {
      Alert.alert("Age requirement", "You must be 16+ (or 18+ with verified identity) to go live. Add your date of birth in Edit Profile or complete Identity Verification.");
      return;
    }
    close();
    navigation.navigate("Live", { screen: "LiveHostSetup" });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={close} activeOpacity={0.8}>
          <MaterialIcons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>CREATE</Text>
        <View style={{ width: 44 }} />
      </View>

      <TouchableOpacity style={styles.card} onPress={navVideo} activeOpacity={0.8}>
        <View style={[styles.cardIcon, { backgroundColor: (colors.primary || "#6366f1") + "20" }]}>
          <MaterialIcons name="videocam" size={28} color={colors.primary || "#6366f1"} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Create video</Text>
          <Text style={styles.cardDesc}>Record or upload from gallery (16+)</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={navLive} activeOpacity={0.8}>
        <View style={[styles.cardIcon, { backgroundColor: (colors.error || "#e53935") + "20" }]}>
          <MaterialIcons name="live-tv" size={28} color={colors.error || "#e53935"} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Go live</Text>
          <Text style={styles.cardDesc}>Start a livestream (16+)</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => { close(); navigation.navigate("Main", { screen: "Safety", params: { screen: "SafetyHub" } }); }}
        activeOpacity={0.8}
      >
        <View style={[styles.cardIcon, { backgroundColor: (colors.warning || "#f59e0b") + "20" }]}>
          <MaterialIcons name="shield" size={28} color={colors.warning || "#f59e0b"} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Safety hub</Text>
          <Text style={styles.cardDesc}>Report abuse, blacklist, missing alerts</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors, insets) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: insets.top + spacing.md,
      paddingHorizontal: spacing.md,
      paddingBottom: insets.bottom + spacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 0.5,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
    },
    closeBtn: {
      width: 44,
      height: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.md,
    },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
    cardDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  });
}
