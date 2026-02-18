import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import NeoCard from "./NeoCard";
import { useThemeColors } from "../../theme/useThemeColors";
import { typography } from "../../theme/designSystem";

export default function StatCard({ value, label, iconName, onPress }) {
  const colors = useThemeColors();
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} activeOpacity={0.8} style={styles.wrapper}>
      <NeoCard style={styles.card}>
        {iconName && (
          <View style={styles.iconWrap}>
            <MaterialIcons name={iconName} size={22} color={colors.primary} />
          </View>
        )}
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      </NeoCard>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  card: { alignItems: "center", padding: 12 },
  iconWrap: { marginBottom: 4 },
  value: { ...typography.cardTitle, fontSize: 18 },
  label: { ...typography.caption, marginTop: 2 },
});
