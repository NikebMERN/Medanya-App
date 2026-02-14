import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";

export default function SafetyHubScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Safety Hub</Text>
      <Text style={styles.subtitle}>Report abuse, check employers, share alerts</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("BlacklistSearch")}
        activeOpacity={0.8}
      >
        <View style={styles.cardIcon}>
          <MaterialIcons name="search" size={28} color={colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Search Blacklist</Text>
          <Text style={styles.cardDesc}>Check phone number or employer name before hiring</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("ReportForm")}
        activeOpacity={0.8}
      >
        <View style={[styles.cardIcon, { backgroundColor: colors.error + "20" }]}>
          <MaterialIcons name="report-problem" size={28} color={colors.error} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Report Scammer</Text>
          <Text style={styles.cardDesc}>Submit scam or abuse report with evidence</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("MissingCreate")}
        activeOpacity={0.8}
      >
        <View style={[styles.cardIcon, { backgroundColor: colors.warning + "20" }]}>
          <MaterialIcons name="person-search" size={28} color={colors.warning} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Report Missing Person</Text>
          <Text style={styles.cardDesc}>Create alert with photo and contact info</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("MissingList")}
        activeOpacity={0.8}
      >
        <View style={[styles.cardIcon, { backgroundColor: colors.primary + "20" }]}>
          <MaterialIcons name="list" size={28} color={colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>View Missing Alerts</Text>
          <Text style={styles.cardDesc}>Browse active missing person alerts</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
    title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
    subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
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
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.md,
    },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
    cardDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  });
}
