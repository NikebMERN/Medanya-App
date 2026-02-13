import React from "react";
import { View, Image, StyleSheet } from "react-native";
import Logo from "./ui/Logo";

/**
 * Full-screen splash shown when the app is loading.
 * #f2f6ff background, Medanya logo centered. Shown for 3–4 seconds on first open.
 */
export default function AppSplashScreen({ logoSource }) {
  return (
    <View style={styles.container}>
      {logoSource ? (
        <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
      ) : (
        <Logo />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: 200,
    height: 200,
  },
});
