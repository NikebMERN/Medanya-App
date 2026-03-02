import { Platform } from "react-native";

/**
 * Use with TextInput style to fix placeholder/text spacing on Android.
 * Example: style={[styles.input, inputStyleAndroid]}
 */
export const inputStyleAndroid = Platform.OS === "android" ? { includeFontPadding: false } : {};
