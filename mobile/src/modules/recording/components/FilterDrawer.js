import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../../theme/useThemeColors";
import { spacing } from "../../../theme/spacing";
import { useRecordingStore } from "../store/recording.store";
import { setLut } from "../../effects/effects.engine";

const TABS = [
  { id: "trending", label: "Trending" },
  { id: "beauty", label: "Portrait" },
  { id: "cinematic", label: "Cinematic" },
  { id: "fun", label: "Fun / Game" },
];

const FILTERS_BY_TAB = {
  trending: [
    { id: "none", label: "None" },
    { id: "vivid", label: "Vivid" },
    { id: "warm", label: "Warm" },
    { id: "cool", label: "Cool" },
  ],
  beauty: [
    { id: "portrait", label: "Portrait" },
    { id: "smooth", label: "Smooth" },
    { id: "natural", label: "Natural" },
  ],
  cinematic: [
    { id: "film", label: "Film" },
    { id: "noir", label: "Noir" },
    { id: "dramatic", label: "Dramatic" },
  ],
  fun: [
    { id: "game1", label: "Coming soon", comingSoon: true },
    { id: "game2", label: "Coming soon", comingSoon: true },
  ],
};

export default function FilterDrawer({ visible, onClose }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [activeTab, setActiveTab] = React.useState("trending");

  const activeFilterId = useRecordingStore((s) => s.activeFilterId);
  const setFilter = useRecordingStore((s) => s.setFilter);

  const filters = FILTERS_BY_TAB[activeTab] || FILTERS_BY_TAB.trending;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.drawer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.tabs}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tab, activeTab === t.id && styles.tabActive]}
                onPress={() => setActiveTab(t.id)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === t.id && styles.tabTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {filters.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterCard,
                  activeFilterId === f.id && styles.filterCardActive,
                  f.comingSoon && styles.filterCardDisabled,
                ]}
                onPress={() => {
                  if (f.comingSoon) return;
                  setFilter(f.id);
                  setLut(f.id);
                }}
                disabled={f.comingSoon}
              >
                <View
                  style={[
                    styles.filterThumb,
                    f.comingSoon && styles.filterThumbDisabled,
                  ]}
                >
                  <MaterialIcons
                    name="filter"
                    size={32}
                    color={
                      f.comingSoon
                        ? colors.textMuted
                        : activeFilterId === f.id
                          ? colors.primary
                          : colors.text
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.filterLabel,
                    f.comingSoon && styles.filterLabelDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    drawer: {
      backgroundColor: colors.surface || "#1a1a1a",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: spacing.xl,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border || "rgba(255,255,255,0.3)",
      alignSelf: "center",
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    tabs: {
      flexDirection: "row",
      paddingHorizontal: spacing.md,
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    tab: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    tabActive: {
      backgroundColor: colors.primary + "40",
    },
    tabText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.primary,
    },
    filterScroll: {
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
      paddingBottom: spacing.md,
    },
    filterCard: {
      alignItems: "center",
      width: 80,
    },
    filterCardActive: {
      opacity: 1,
    },
    filterCardDisabled: {
      opacity: 0.5,
    },
    filterThumb: {
      width: 64,
      height: 64,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.1)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    filterThumbDisabled: {
      backgroundColor: "rgba(255,255,255,0.05)",
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
    },
    filterLabelDisabled: {
      color: colors.textMuted,
    },
  });
}
