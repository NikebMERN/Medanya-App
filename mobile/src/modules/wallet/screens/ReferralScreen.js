import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Share, Alert, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../../theme/useThemeColors";
import { radii, layout } from "../../../theme/designSystem";
import { spacing } from "../../../theme/spacing";
import { useWalletStore } from "../wallet.store";

export default function ReferralScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { referralStats, fetchReferralStats } = useWalletStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferralStats().finally(() => setLoading(false));
  }, [fetchReferralStats]);

  const code = referralStats?.code ?? "ABCD12";
  const link = "https://medanya.app/invite/" + code;

  const share = async () => {
    try {
      await Share.share({ message: "Join Medanya! Code " + code + ": " + link, title: "Invite to Medanya", url: Platform.OS === "ios" ? link : undefined });
    } catch (e) {
      if (e?.message !== "User did not share") Alert.alert("Error", e?.message);
    }
  };

  const copyLink = async () => {
    try {
      await Clipboard.setStringAsync(link);
      Alert.alert("Copied", "Invite link copied to clipboard.");
    } catch (e) {
      Share.share({ message: link, title: "Invite link" }).catch(() => {});
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialIcons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Invite & Earn</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your invite code</Text>
          <Text style={styles.codeValue}>{code}</Text>
          <View style={styles.shareRow}>
            <TouchableOpacity style={styles.shareBtn} onPress={copyLink}>
              <MaterialIcons name="content-copy" size={20} color={colors.white} />
              <Text style={styles.shareText}>Copy link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={share}>
              <MaterialIcons name="share" size={20} color={colors.white} />
              <Text style={styles.shareText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statValue}>{referralStats?.invited ?? 0}</Text><Text style={styles.statLabel}>Invited</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{referralStats?.eligible ?? 0}</Text><Text style={styles.statLabel}>Eligible</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, { color: colors.primary }]}>{referralStats?.earned ?? 0} MC</Text><Text style={styles.statLabel}>Earned</Text></View>
        </View>
        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>Rules</Text>
          <Text style={styles.rulesText}>Earn MC when friends sign up. Anti-fraud: fake invites not rewarded.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: layout.screenPadding, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    scrollContent: { padding: layout.screenPadding, paddingBottom: spacing.xxl },
    codeCard: { backgroundColor: colors.surface, borderRadius: radii.card, padding: layout.cardPadding, marginBottom: layout.sectionGap, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
    codeLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
    codeValue: { fontSize: 28, fontWeight: "800", color: colors.primary, letterSpacing: 4 },
    shareRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
    shareBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radii.button, backgroundColor: colors.primary },
    shareText: { fontSize: 16, fontWeight: "700", color: colors.white },
    statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: layout.sectionGap },
    statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.card, padding: layout.cardPadding, alignItems: "center", borderWidth: 1, borderColor: colors.border },
    statValue: { fontSize: 20, fontWeight: "800", color: colors.text },
    statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    rulesCard: { backgroundColor: colors.surfaceLight, borderRadius: radii.input, padding: layout.cardPadding, borderWidth: 1, borderColor: colors.border },
    rulesTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    rulesText: { fontSize: 13, color: colors.textMuted, lineHeight: 22 },
  });
}
