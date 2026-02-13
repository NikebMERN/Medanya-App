import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useRoute } from "@react-navigation/native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export default function FeedScreen() {
  const route = useRoute();
  const [refreshing, setRefreshing] = useState(false);
  const refreshKeyRef = useRef(route.params?.refresh);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Placeholder for future feed reload
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  useEffect(() => {
    const key = route.params?.refresh;
    if (key != null && key !== refreshKeyRef.current) {
      refreshKeyRef.current = key;
      onRefresh();
    }
  }, [route.params?.refresh, onRefresh]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={styles.title}>Feed</Text>
      <Text style={styles.subtitle}>Phase 5 – Community feed will load here</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg,
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: spacing.sm,
    fontStyle: typography.fontStyle,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: typography.fontStyle,
  },
});
