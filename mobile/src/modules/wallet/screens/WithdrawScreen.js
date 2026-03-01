import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../../theme/useThemeColors";
import { radii, layout } from "../../../theme/designSystem";
import { spacing } from "../../../theme/spacing";
import { useWalletStore } from "../wallet.store";
import * as walletApi from "../wallet.api";

const MIN = 500;

export default function WithdrawScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { earningsBalance } = useWalletStore();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const available = earningsBalance ?? 0;
  const num = parseInt(String(amount).replace(/\D/g, ""), 10) || 0;
  const valid = num >= MIN && num <= available;

  const handleSubmit = async () => {
    if (!valid) {
      Alert.alert("Invalid", `Min ${MIN} MC. Available: ${available} MC`);
      return;
    }
    setLoading(true);
    try {
      await walletApi.requestCashout(num, "bank_transfer");
      Alert.alert("Submitted", "Withdrawal request submitted.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error?.message ?? e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialIcons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.label}>Available</Text>
          <Text style={styles.availableValue}>{available} MC</Text>
        </View>
        <Text style={styles.label}>Amount (MC)</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/\D/g, ""))}
          placeholder={`Min ${MIN}`}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
        <TouchableOpacity style={[styles.btn, (!valid || loading) && styles.btnDisabled]} onPress={handleSubmit} disabled={!valid || loading}>
          {loading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.btnText}>Submit</Text>}
        </TouchableOpacity>
        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>Rules</Text>
          <Text style={styles.rulesText}>Min threshold: 500 MC. Weekly cadence. Large payouts take longer.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: layout.screenPadding, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    scrollContent: { padding: layout.screenPadding, paddingBottom: spacing.xxl },
    card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: layout.cardPadding, marginBottom: layout.sectionGap, borderWidth: 1, borderColor: colors.border },
    label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm },
    availableValue: { fontSize: 24, fontWeight: "800", color: colors.primary },
    input: { backgroundColor: colors.inputBg, borderRadius: radii.input, padding: layout.cardPadding, fontSize: 18, color: colors.text, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
    btn: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radii.button, alignItems: "center" },
    btnDisabled: { opacity: 0.6 },
    btnText: { fontSize: 16, fontWeight: "700", color: colors.white },
    rulesCard: { marginTop: layout.sectionGap, backgroundColor: colors.surfaceLight, borderRadius: radii.input, padding: layout.cardPadding, borderWidth: 1, borderColor: colors.border },
    rulesTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    rulesText: { fontSize: 13, color: colors.textMuted, lineHeight: 22 },
  });
}
