import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { useAuthStore } from "../store/auth.store";
import { useHeaderBack } from "../context/HeaderBackContext";
import { spacing } from "../theme/spacing";

function canShowBack(navigation) {
  if (!navigation?.getState) return false;
  const state = navigation.getState();
  const routes = state?.routes;
  const index = state?.index;
  if (!routes?.length || index == null) return false;
  const currentTab = routes[index];
  const nestedState = currentTab?.state;
  const nestedIndex = nestedState?.index;
  const nestedRoutes = nestedState?.routes;
  if (nestedRoutes?.length && nestedIndex > 0) return true;
  return false;
}

export default function AppHeader({ navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors, insets.top);
  const user = useAuthStore((s) => s.user);
  const avatarUrl = user?.avatar_url ?? user?.avatarUrl;
  const displayName = user?.display_name ?? user?.displayName ?? "";
  const { callBack } = useHeaderBack() || {};
  const showBack = navigation ? canShowBack(navigation) : false;

  const handleBack = () => {
    if (callBack) {
      callBack();
      return;
    }
    if (navigation?.dispatch) {
      navigation.dispatch(CommonActions.goBack());
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.logo}>
          <Text style={styles.logoLetter}>M</Text>
        </View>
        <Text style={styles.title}>MEDANYA</Text>
      </View>
      <View style={styles.right}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
          <Text style={styles.playIcon}>▶</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.avatarBtn} activeOpacity={0.8}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>
                {(displayName || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors, paddingTop) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingTop: paddingTop + spacing.sm,
      paddingBottom: spacing.md,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    left: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    logo: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    logoLetter: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.white,
    },
    title: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 0.5,
    },
    right: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    playIcon: {
      fontSize: 12,
      color: colors.text,
      marginLeft: 2,
    },
    avatarBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: "hidden",
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    avatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarLetter: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
  });
}
