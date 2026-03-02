import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { typography, radii } from "../../theme/designSystem";
import NeoCard from "../../components/ui/NeoCard";

export default function SafetyHubScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>SAFETY HUB</Text>
      <Text style={styles.subtitle}>COMMUNITY GUARD v2.5</Text>

      <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate("BlacklistSearch")}>
        <NeoCard style={styles.searchCard}>
          <Text style={styles.sectionLabel}>AI SCAMMER CHECK</Text>
          <View style={styles.searchPlaceholder}>
            <MaterialIcons name="search" size={20} color={colors.textMuted} />
            <Text style={styles.searchPlaceholderText}>Search number or name...</Text>
          </View>
        </NeoCard>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("ReportForm")} activeOpacity={0.9}>
        <NeoCard style={[styles.bigCard, styles.redCard]}>
          <MaterialIcons name="report-problem" size={32} color={colors.white} style={styles.bigCardIcon} />
          <View style={styles.bigCardTextWrap}>
            <Text style={styles.bigCardTitle} numberOfLines={1}>REPORT SCAMMER</Text>
            <Text style={styles.bigCardSub} numberOfLines={2}>Expose fraudulent activity</Text>
          </View>
        </NeoCard>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("MissingCreate")} activeOpacity={0.9}>
        <NeoCard style={[styles.bigCard, styles.purpleCard]}>
          <MaterialIcons name="person-search" size={32} color={colors.white} style={styles.bigCardIcon} />
          <View style={styles.bigCardTextWrap}>
            <Text style={styles.bigCardTitle} numberOfLines={1}>REPORT MISSING</Text>
            <Text style={styles.bigCardSub} numberOfLines={2}>Create alert with photo and contact</Text>
          </View>
        </NeoCard>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Quick actions</Text>
      <TouchableOpacity onPress={() => navigation.navigate("BlacklistSearch")} activeOpacity={0.8}>
        <NeoCard style={styles.card}>
          <View style={styles.cardIcon}>
            <MaterialIcons name="search" size={28} color={colors.primary} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>Search Blacklist</Text>
            <Text style={styles.cardDesc} numberOfLines={1}>Check phone or employer name</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} style={styles.cardChevron} />
        </NeoCard>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("MissingList")} activeOpacity={0.8}>
        <NeoCard style={styles.card}>
          <View style={[styles.cardIcon, { backgroundColor: colors.primary + "20" }]}>
            <MaterialIcons name="list" size={28} color={colors.primary} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>View Missing Alerts</Text>
            <Text style={styles.cardDesc} numberOfLines={1}>Browse active missing person alerts</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} style={styles.cardChevron} />
        </NeoCard>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, paddingBottom: spacing.xxl },
    title: { ...typography.sectionTitle, color: colors.text, marginBottom: spacing.xs },
    subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg, letterSpacing: 0.5 },
    sectionLabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.sm },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
    searchCard: { marginBottom: spacing.md },
    searchPlaceholder: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg || colors.surfaceLight,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.md,
      minHeight: 44,
      gap: spacing.sm,
    },
    searchPlaceholderText: { fontSize: 15, color: colors.textMuted },
    bigCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.lg,
      marginBottom: spacing.sm,
      borderRadius: radii.card,
    },
    redCard: { backgroundColor: (colors.error || "#ef4444") + "dd" },
    purpleCard: { backgroundColor: "#6B4EAA" },
    bigCardIcon: { marginRight: spacing.md },
    bigCardTextWrap: { flex: 1, minWidth: 0 },
    bigCardTitle: { fontSize: 16, fontWeight: "800", color: colors.white, letterSpacing: 0.5 },
    bigCardSub: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    cardIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.md,
    },
    cardBody: { flex: 1, minWidth: 0, marginRight: spacing.sm },
    cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
    cardDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    cardChevron: { flexShrink: 0 },
  });
}
