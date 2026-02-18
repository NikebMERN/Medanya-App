import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";

export default function CreateScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const kycFaceVerified = useAuthStore((s) => s.user?.kyc_face_verified ?? s.user?.kycFaceVerified ?? false);
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  const close = () => navigation.goBack();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={close} activeOpacity={0.8}>
          <MaterialIcons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>CREATE CONTENT</Text>
        <View style={{ width: 44 }} />
      </View>

      {kycFaceVerified && (
        <>
          <TouchableOpacity
            style={styles.card}
            onPress={() => { close(); navigation.navigate("Main", { screen: "Jobs", params: { screen: "CreateJob" } }); }}
            activeOpacity={0.8}
          >
            <View style={[styles.cardIcon, { backgroundColor: colors.primary + "20" }]}>
              <MaterialIcons name="work" size={28} color={colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Create job</Text>
              <Text style={styles.cardDesc}>Post a job for workers</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => { close(); navigation.navigate("Main", { screen: "Marketplace", params: { screen: "CreateItem" } }); }}
            activeOpacity={0.8}
          >
            <View style={[styles.cardIcon, { backgroundColor: colors.primary + "20" }]}>
              <MaterialIcons name="storefront" size={28} color={colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Trade</Text>
              <Text style={styles.cardDesc}>Sell an item on the marketplace</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.card}
        onPress={() => { close(); navigation.navigate("Live", { screen: "LiveList" }); }}
        activeOpacity={0.8}
      >
        <View style={[styles.cardIcon, { backgroundColor: (colors.primary || "#6366f1") + "20" }]}>
          <MaterialIcons name="videocam" size={28} color={colors.primary || "#6366f1"} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Watch live</Text>
          <Text style={styles.cardDesc}>Browse and join live streams</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => { close(); navigation.navigate("Live", { screen: "LiveHostSetup" }); }}
        activeOpacity={0.8}
      >
        <View style={[styles.cardIcon, { backgroundColor: (colors.error || "#e53935") + "20" }]}>
          <MaterialIcons name="live-tv" size={28} color={colors.error || "#e53935"} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Go live</Text>
          <Text style={styles.cardDesc}>Start your own live stream (18+)</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => { close(); navigation.navigate("VideoReels", { screen: "VideoUpload" }); }}
        activeOpacity={0.8}
      >
        <View style={[styles.cardIcon, { backgroundColor: (colors.primary || "#6366f1") + "20" }]}>
          <MaterialIcons name="videocam" size={28} color={colors.primary || "#6366f1"} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>SHOOT SHORT</Text>
          <Text style={styles.cardDesc}>Record a new video</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => { close(); navigation.navigate("VideoReels", { screen: "VideoUpload" }); }}
        activeOpacity={0.8}
      >
        <View style={[styles.cardIcon, { backgroundColor: (colors.primary || "#6366f1") + "20" }]}>
          <MaterialIcons name="photo-library" size={28} color={colors.primary || "#6366f1"} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>FROM GALLERY</Text>
          <Text style={styles.cardDesc}>Upload saved videos</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => { close(); navigation.navigate("Live", { screen: "LiveHostSetup" }); }}
        activeOpacity={0.8}
      >
        <View style={[styles.cardIcon, { backgroundColor: (colors.error || "#e53935") + "20" }]}>
          <MaterialIcons name="live-tv" size={28} color={colors.error || "#e53935"} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>GO LIVE</Text>
          <Text style={styles.cardDesc}>Stream to community</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => { close(); navigation.navigate("VideoReels"); }}
        activeOpacity={0.8}
      >
        <View style={[styles.cardIcon, { backgroundColor: (colors.primary || "#6366f1") + "20" }]}>
          <MaterialIcons name="movie" size={28} color={colors.primary || "#6366f1"} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Reels</Text>
          <Text style={styles.cardDesc}>Watch or upload short videos</Text>
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
