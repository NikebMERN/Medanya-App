/**
 * VideoEditScreen — MVP: trim, cover frame, filter preset.
 * Timeline scrubber, tool row (Trim, Cover, Filter), Next -> Publish.
 */
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useVideoCreateStore, FILTER_PRESETS } from "../../store/videoCreate.store";
import SubScreenHeader from "../../components/SubScreenHeader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PREVIEW_HEIGHT = SCREEN_WIDTH * (16 / 9);

export default function VideoEditScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  const draftUri = useVideoCreateStore((s) => s.draftUri);
  const trimStartMs = useVideoCreateStore((s) => s.trimStartMs);
  const trimEndMs = useVideoCreateStore((s) => s.trimEndMs);
  const selectedFilterId = useVideoCreateStore((s) => s.selectedFilterId);
  const setTrim = useVideoCreateStore((s) => s.setTrim);
  const setFilter = useVideoCreateStore((s) => s.setFilter);

  const [activeTool, setActiveTool] = useState(null);
  const [trimEnd, setTrimEndLocal] = useState(trimEndMs);

  const durationMs = useVideoCreateStore((s) => s.draftDurationMs) || 0;
  useEffect(() => {
    if (trimEndMs != null) setTrimEndLocal(trimEndMs);
    else setTrimEndLocal(durationMs);
  }, [trimEndMs, durationMs]);

  const goNext = useCallback(() => {
    setTrim(trimStartMs, trimEnd);
    navigation.replace("VideoPublish");
  }, [trimStartMs, trimEnd, setTrim, navigation]);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const player = useVideoPlayer(draftUri ?? "", (p) => {
    p.loop = true;
  });

  if (!draftUri) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>No draft video. Go back and record or pick one.</Text>
        <TouchableOpacity onPress={goBack}><Text style={styles.link}>Back</Text></TouchableOpacity>
      </View>
    );
  }

  const tabNav = navigation.getParent?.() ?? navigation;
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubScreenHeader
        title="Edit"
        onBack={goBack}
        showProfileDropdown
        navigation={tabNav}
        rightElement={
          <TouchableOpacity onPress={goNext} style={styles.headerBtn}>
            <Text style={[styles.nextText, { color: colors.primary }]}>Next</Text>
          </TouchableOpacity>
        }
      />

      <View style={[styles.previewWrap, { height: PREVIEW_HEIGHT }]}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
        />
        <View style={[styles.filterOverlay, selectedFilterId !== "none" && styles.filterOverlayActive]} pointerEvents="none" />
      </View>

      <View style={styles.timeline}>
        <View style={styles.timelineTrack} />
        <View style={[styles.timelineFill, { left: "0%", width: "100%" }]} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolRow} contentContainerStyle={styles.toolRowContent}>
        <TouchableOpacity
          style={[styles.toolChip, activeTool === "trim" && styles.toolChipActive]}
          onPress={() => setActiveTool(activeTool === "trim" ? null : "trim")}
        >
          <MaterialIcons name="content-cut" size={22} color={colors.text} />
          <Text style={styles.toolChipText}>Trim</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolChip, activeTool === "cover" && styles.toolChipActive]}
          onPress={() => setActiveTool(activeTool === "cover" ? null : "cover")}
        >
          <MaterialIcons name="image" size={22} color={colors.text} />
          <Text style={styles.toolChipText}>Cover</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolChip, activeTool === "filter" && styles.toolChipActive]}
          onPress={() => setActiveTool(activeTool === "filter" ? null : "filter")}
        >
          <MaterialIcons name="filter" size={22} color={colors.text} />
          <Text style={styles.toolChipText}>Filter</Text>
        </TouchableOpacity>
      </ScrollView>

      {activeTool === "filter" && (
        <View style={styles.filterList}>
          {FILTER_PRESETS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, selectedFilterId === f.id && styles.filterChipActive]}
              onPress={() => { setFilter(f.id); setActiveTool(null); }}
            >
              <Text style={[styles.filterChipText, selectedFilterId === f.id && { color: colors.primary }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeTool === "trim" && (
        <View style={styles.trimHint}>
          <Text style={styles.hintText}>Trim: use sliders in a future build. For now, full clip is used.</Text>
          <TouchableOpacity onPress={() => setActiveTool(null)}><Text style={styles.link}>Done</Text></TouchableOpacity>
        </View>
      )}

      {activeTool === "cover" && (
        <View style={styles.coverHint}>
          <Text style={styles.hintText}>Cover: choose a frame as thumbnail. For now, first frame is used.</Text>
          <TouchableOpacity onPress={() => setActiveTool(null)}><Text style={styles.link}>Done</Text></TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={[styles.nextBtn, { marginBottom: insets.bottom + spacing.lg }]} onPress={goNext} activeOpacity={0.8}>
        <Text style={styles.nextBtnText}>Next → Publish</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function createStyles(colors, insets) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
    nextText: { fontSize: 16, fontWeight: "600" },
    previewWrap: { width: "100%", backgroundColor: "#000" },
    video: { width: "100%", height: "100%" },
    filterOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "transparent" },
    filterOverlayActive: { backgroundColor: "rgba(0,0,0,0.1)" },
    timeline: { height: 4, backgroundColor: colors.surfaceLight, marginHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: 2, overflow: "hidden" },
    timelineTrack: { ...StyleSheet.absoluteFillObject },
    timelineFill: { position: "absolute", top: 0, bottom: 0, backgroundColor: colors.primary, borderRadius: 2 },
    toolRow: { maxHeight: 56, marginTop: spacing.md },
    toolRowContent: { paddingHorizontal: spacing.md, gap: spacing.sm, flexDirection: "row", alignItems: "center" },
    toolChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.surfaceLight,
    },
    toolChipActive: { backgroundColor: colors.primary + "25", borderWidth: 1, borderColor: colors.primary },
    toolChipText: { fontSize: 14, fontWeight: "600", color: colors.text },
    filterList: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.md, marginTop: spacing.sm, gap: spacing.sm },
    filterChip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: 20, backgroundColor: colors.surfaceLight },
    filterChipActive: { backgroundColor: colors.primary + "20", borderWidth: 1, borderColor: colors.primary },
    filterChipText: { fontSize: 13, fontWeight: "600", color: colors.text },
    trimHint: { padding: spacing.md },
    coverHint: { padding: spacing.md },
    hintText: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },
    link: { fontSize: 14, fontWeight: "600", color: colors.primary },
    nextBtn: {
      alignSelf: "center",
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    nextBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
    error: { fontSize: 14, color: colors.error, textAlign: "center", marginTop: spacing.xl },
  });
}
