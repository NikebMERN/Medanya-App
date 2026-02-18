import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import NeoCard from "./NeoCard";
import Badge from "./Badge";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";

/**
 * Generic feed card: optional image, type badge, title, summary, optional action.
 */
export default function FeedCard({
  imageUri,
  typeLabel,
  typeVariant,
  title,
  summary,
  location,
  onPress,
  actionLabel,
  onActionPress,
  iconName,
}) {
  const colors = useThemeColors();
  const icon = iconName || (typeLabel === "Job" ? "work" : typeLabel === "Alert" ? "warning" : typeLabel === "Missing" ? "person-search" : typeLabel === "Market" ? "storefront" : "videocam");
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <NeoCard style={styles.card}>
        <View style={styles.inner}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.img} resizeMode="cover" />
          ) : (
            <View style={[styles.imgPlaceholder, { backgroundColor: colors.surfaceLight }]}>
              <MaterialIcons name={icon} size={36} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.body}>
            {typeLabel ? <Badge label={typeLabel} variant={typeVariant} style={styles.badge} /> : null}
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            {summary ? <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>{summary}</Text> : null}
            {location ? (
              <View style={styles.location}>
                <MaterialIcons name="location-on" size={12} color={colors.textMuted} />
                <Text style={[styles.locationText, { color: colors.textMuted }]} numberOfLines={1}>{location}</Text>
              </View>
            ) : null}
            {actionLabel && onActionPress ? (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={onActionPress}>
                <Text style={styles.actionText}>{actionLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {!actionLabel && <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />}
        </View>
      </NeoCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  inner: { flexDirection: "row", alignItems: "center" },
  img: { width: 72, height: 72, borderRadius: 10 },
  imgPlaceholder: { width: 72, height: 72, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  body: { flex: 1, marginLeft: spacing.md },
  badge: { marginBottom: 4 },
  title: { fontSize: 16, fontWeight: "700" },
  summary: { fontSize: 13, marginTop: 2 },
  location: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 },
  locationText: { fontSize: 12, flex: 1 },
  actionBtn: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, alignSelf: "flex-start" },
  actionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
