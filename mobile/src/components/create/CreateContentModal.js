/**
 * CREATE CONTENT — TikTok/YouTube-style entry modal.
 * Full-screen dark modal: Shoot Short, From Gallery, Go Live.
 */
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { radii } from "../../theme/designSystem";

const CARD_BG = "rgba(255,255,255,0.08)";
const CARD_BORDER = "rgba(255,255,255,0.12)";

export default function CreateContentModal({ visible, onClose, onShootShort, onFromGallery, onGoLive }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8} hitSlop={12}>
              <MaterialIcons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>CREATE CONTENT</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.cards}>
            <TouchableOpacity style={styles.card} onPress={onShootShort} activeOpacity={0.85}>
              <View style={[styles.cardIcon, { backgroundColor: (colors.primary || "#6366f1") + "30" }]}>
                <MaterialIcons name="videocam" size={32} color={colors.primary || "#6366f1"} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>SHOOT SHORT</Text>
                <Text style={styles.cardSubtitle}>Record a new video</Text>
              </View>
              <MaterialIcons name="chevron-right" size={26} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={onFromGallery} activeOpacity={0.85}>
              <View style={[styles.cardIcon, { backgroundColor: "rgba(34,197,94,0.3)" }]}>
                <MaterialIcons name="photo-library" size={32} color="#22c55e" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>FROM GALLERY</Text>
                <Text style={styles.cardSubtitle}>Upload saved videos</Text>
              </View>
              <MaterialIcons name="chevron-right" size={26} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={onGoLive} activeOpacity={0.85}>
              <View style={[styles.cardIcon, { backgroundColor: (colors.error || "#ef4444") + "30" }]}>
                <MaterialIcons name="live-tv" size={32} color={colors.error || "#ef4444"} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>GO LIVE</Text>
                <Text style={styles.cardSubtitle}>Stream to community</Text>
              </View>
              <MaterialIcons name="chevron-right" size={26} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors, insets) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.85)",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
    },
    container: {
      backgroundColor: colors.background || "#0f0f12",
      borderRadius: radii.card,
      paddingTop: insets.top + spacing.md,
      paddingBottom: insets.bottom + spacing.xl,
      paddingHorizontal: spacing.lg,
      maxWidth: 420,
      alignSelf: "center",
      width: "100%",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.xl,
    },
    closeBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
    title: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 0.8,
    },
    placeholder: { width: 44 },
    cards: { gap: spacing.md },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: CARD_BG,
      borderRadius: 16,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: CARD_BORDER,
    },
    cardIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.md,
    },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text, letterSpacing: 0.5 },
    cardSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  });
}
