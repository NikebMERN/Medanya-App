import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import * as ordersApi from "../../services/orders.api";

export default function DeliveryConfirmScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const orderId = route.params?.orderId;
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const c = String(code || "").trim();
    if (c.length !== 7 || !/^\d{7}$/.test(c)) {
      Alert.alert("Invalid code", "Enter the 7-digit delivery code from the buyer.");
      return;
    }
    setLoading(true);
    try {
      await ordersApi.confirmDelivery(orderId, c);
      Alert.alert("Success", "Delivery confirmed. Order completed.", [
        { text: "OK", onPress: () => navigation.replace("OrderStatus", { orderId }) },
      ]);
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || "Invalid code";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubScreenHeader title="Confirm delivery" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text style={styles.instruction}>
          Ask the buyer for their 7-digit delivery code. Enter it below to complete the order.
        </Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 7))}
          placeholder="0000000"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={7}
        />
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading || code.length !== 7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.btnText}>Confirm</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg },
    instruction: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
      lineHeight: 24,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      padding: spacing.lg,
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      letterSpacing: 8,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    btn: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
    },
    btnDisabled: { opacity: 0.7 },
    btnText: { fontSize: 16, fontWeight: "700", color: colors.white },
  });
}
