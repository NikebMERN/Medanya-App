import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { getBlacklistSummary } from "../../services/reports.api";
import SubScreenHeader from "../../components/SubScreenHeader";

export default function BlacklistDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const item = route.params?.item;
  const phoneNumber = route.params?.phoneNumber || item?.phoneNumber || "";
  const [summary, setSummary] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(!!phoneNumber && !item);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!phoneNumber) {
      if (item) {
        setSummary(item);
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getBlacklistSummary(phoneNumber, { limit: 20 });
      setSummary(res.summary ?? item ?? null);
      setRecentReports(res.recentReports ?? []);
    } catch (err) {
      setSummary(item ?? null);
      setRecentReports([]);
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, item]);

  useEffect(() => {
    if (item && !phoneNumber) {
      setSummary(item);
      setLoading(false);
      return;
    }
    load();
  }, [load, item, phoneNumber]);

  if (loading && !summary && !item) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  let displaySummary = summary || item;
  if (displaySummary && displaySummary.type === "report" && displaySummary.preview) {
    displaySummary = {
      riskLevel: displaySummary.preview.riskLevel || displaySummary.riskLevel || "warning",
      totalReports: displaySummary.preview.totalReports ?? displaySummary.totalReports ?? 0,
      employerName: (displaySummary.title || "").replace(/^Reported:\s*/, "") || displaySummary.employerName || "",
      phoneNumber: displaySummary.preview.phoneMasked || displaySummary.id || displaySummary.phoneNumber || "",
      locationText: displaySummary.location || displaySummary.locationText || "",
    };
  }
  if (!displaySummary) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="check-circle" size={48} color={colors.success} />
        <Text style={styles.notFoundText}>No reports found for this number</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const riskColor = displaySummary.riskLevel === "dangerous" ? colors.error : colors.warning;

  const tabNav = navigation.getParent?.() ?? navigation;
  return (
    <View style={styles.wrapper}>
      <SubScreenHeader
        title="Blacklist Detail"
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={tabNav}
      />
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.riskBanner, { backgroundColor: riskColor + "20" }]}>
        <Text style={[styles.riskLabel, { color: riskColor }]}>
          {displaySummary.riskLevel?.toUpperCase() || "WARNING"}
        </Text>
        <Text style={styles.riskMeta}>{displaySummary.totalReports ?? 0} total reports</Text>
      </View>
      {displaySummary.employerName ? (
        <>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{displaySummary.employerName}</Text>
        </>
      ) : null}
      <Text style={styles.label}>Phone</Text>
      <Text style={styles.value}>{displaySummary.phoneNumber}</Text>
      {displaySummary.locationText ? (
        <>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{displaySummary.locationText}</Text>
        </>
      ) : null}
      <Text style={styles.sectionTitle}>Recent Reports</Text>
      {recentReports.length === 0 ? (
        <Text style={styles.mutedText}>No recent report details</Text>
      ) : (
        recentReports.map((r, i) => (
          <View key={i} style={styles.reportCard}>
            <Text style={styles.reportReason}>{r.reason || "Report"}</Text>
            {r.description ? (
              <Text style={styles.reportDesc} numberOfLines={3}>
                {r.description}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    wrapper: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
    riskBanner: {
      padding: spacing.md,
      borderRadius: 12,
      marginBottom: spacing.lg,
      alignItems: "center",
    },
    riskLabel: { fontSize: 18, fontWeight: "800" },
    riskMeta: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    label: { fontSize: 12, fontWeight: "600", color: colors.textMuted, marginTop: spacing.md },
    value: { fontSize: 15, color: colors.text, marginTop: 2 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
    reportCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    reportReason: { fontSize: 14, fontWeight: "600", color: colors.text, textTransform: "capitalize" },
    reportDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    mutedText: { fontSize: 14, color: colors.textMuted },
    errorText: { fontSize: 15, color: colors.error, textAlign: "center", marginBottom: spacing.sm },
    notFoundText: { fontSize: 15, color: colors.text, marginTop: spacing.md, textAlign: "center" },
    retryBtn: { marginTop: spacing.md, padding: spacing.sm },
    retryText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  });
}
