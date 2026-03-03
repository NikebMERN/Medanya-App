/**
 * RecordingScreen — TikTok-like: full-screen camera, right tools, duration selector, segmented recording.
 */
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../../theme/useThemeColors";
import { spacing } from "../../../theme/spacing";
import { useRecordingStore } from "../store/recording.store";
import RightTools from "../components/RightTools";
import DurationSelector from "../components/DurationSelector";
import RecordButton from "../components/RecordButton";
import FilterStrip from "../components/FilterStrip";

const MAX_TOTAL_MS = 15 * 60 * 1000;

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
}

export default function RecordingScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const colors = useThemeColors();
  const cameraRef = useRef(null);
  const elapsedIntervalRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [beautySheetVisible, setBeautySheetVisible] = useState(false);
  const [speedSheetVisible, setSpeedSheetVisible] = useState(false);

  const durationMode = useRecordingStore((s) => s.durationMode);
  const maxSegmentSec = useRecordingStore((s) => s.maxSegmentSec);
  const recordedSegments = useRecordingStore((s) => s.recordedSegments);
  const isRecording = useRecordingStore((s) => s.isRecording);
  const segmentElapsedMs = useRecordingStore((s) => s.segmentElapsedMs);
  const timerDelay = useRecordingStore((s) => s.timerDelay);
  const setDurationMode = useRecordingStore((s) => s.setDurationMode);
  const addSegment = useRecordingStore((s) => s.addSegment);
  const setRecording = useRecordingStore((s) => s.setRecording);
  const setSegmentElapsed = useRecordingStore((s) => s.setSegmentElapsed);
  const canRecordMore = useRecordingStore((s) => s.canRecordMore);
  const getTotalElapsedMs = useRecordingStore((s) => s.getTotalElapsedMs);
  const clearRecording = useRecordingStore((s) => s.clearRecording);

  const [facing, setFacing] = useState("back");
  const [flashOn, setFlashOn] = useState(false);
  const [timerSec, setTimerSec] = useState(0);
  const [recordingStartAt, setRecordingStartAt] = useState(null);

  const totalElapsed = (recordedSegments || []).reduce((s, sg) => s + sg.durationMs, 0) + segmentElapsedMs;

  useEffect(() => {
    if (isRecording && recordingStartAt) {
      elapsedIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - recordingStartAt;
        setSegmentElapsed(Math.min(elapsed, maxSegmentSec * 1000));
      }, 100);
    }
    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [isRecording, recordingStartAt, maxSegmentSec, setSegmentElapsed]);

  const startRecording = useCallback(() => {
    if (!cameraRef.current || !canRecordMore()) return;
    if (totalElapsed >= MAX_TOTAL_MS) {
      Alert.alert("Limit reached", "Maximum 15 minutes total.");
      return;
    }
    setRecording(true);
    setRecordingStartAt(Date.now());
    requestAnimationFrame(() => {
      (async () => {
        try {
          const video = await cameraRef.current?.recordAsync?.({
            maxDuration: maxSegmentSec,
            mirror: facing === "front",
          });
          if (video?.uri) {
            const durationMs = (video.duration ?? maxSegmentSec) * 1000;
            addSegment(video.uri, durationMs);
          }
        } catch (e) {
          Alert.alert("Recording failed", e?.message ?? "Could not record video.");
        } finally {
          setRecording(false);
          setRecordingStartAt(null);
          setSegmentElapsed(0);
        }
      })();
    });
  }, [canRecordMore, totalElapsed, maxSegmentSec, facing, addSegment, setRecording, setSegmentElapsed]);

  const stopRecording = useCallback(() => {
    cameraRef.current?.stopRecording?.();
  }, []);

  const handleRecordPress = useCallback(() => {
    if (isRecording) {
      stopRecording();
      return;
    }
    startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const handleNext = useCallback(() => {
    const segments = useRecordingStore.getState().recordedSegments;
    if (!segments?.length) return;
    const first = segments[0];
    const totalDur = segments.reduce((s, sg) => s + sg.durationMs, 0);
    const { useVideoCreateStore } = require("../../../store/videoCreate.store");
    const vcs = useVideoCreateStore.getState();
    vcs.setDraft(first.uri, "recorded", totalDur);
    segments.forEach((sg, i) => {
      if (i > 0) vcs.addSegment(sg.uri, sg.durationMs);
    });
    navigation.replace("VideoEdit");
  }, [navigation]);

  const handleUpload = useCallback(() => {
    navigation.replace("VideoCreate");
  }, [navigation]);

  const cycleTimer = useCallback(() => {
    setTimerSec((s) => (s === 0 ? 3 : s === 3 ? 5 : 0));
  }, []);

  if (!permission?.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.permText}>Camera permission required</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stylesheet = createStyles(colors);

  return (
    <View style={stylesheet.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
        flash={flashOn ? "on" : "off"}
        onCameraReady={() => {}}
      />

      <TouchableOpacity
        style={[stylesheet.backBtn, { top: insets.top + spacing.sm }]}
        onPress={() => navigation.goBack()}
      >
        <MaterialIcons name="close" size={28} color="#fff" />
      </TouchableOpacity>

      <View style={[stylesheet.progressBar, { top: insets.top + 50 }]}>
        {(recordedSegments || []).map((sg, i) => (
          <View
            key={i}
            style={[
              stylesheet.progressSegment,
              { width: `${(sg.durationMs / MAX_TOTAL_MS) * 100}%` },
            ]}
          />
        ))}
        {isRecording && (
          <View
            style={[
              stylesheet.progressSegment,
              stylesheet.progressSegmentActive,
              { width: `${(segmentElapsedMs / MAX_TOTAL_MS) * 100}%` },
            ]}
          />
        )}
      </View>

      <RightTools
        onFlip={() => setFacing((f) => (f === "back" ? "front" : "back"))}
        onSpeed={() => setSpeedSheetVisible(true)}
        onBeauty={() => setBeautySheetVisible(true)}
        onTimer={cycleTimer}
        onFlash={() => setFlashOn((f) => !f)}
        onUpload={handleUpload}
        flashOn={flashOn}
        timerSec={timerSec}
      />

      <View
        style={[
          stylesheet.bottomBar,
          {
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <FilterStrip />
        <DurationSelector selectedId={durationMode} onSelect={setDurationMode} />
        <View style={stylesheet.recordRow}>
          <View style={stylesheet.soundPlaceholder} />
          <RecordButton
            isRecording={isRecording}
            loading={false}
            disabled={!canRecordMore() && !isRecording}
            onPress={handleRecordPress}
          />
          <TouchableOpacity
            style={stylesheet.nextBtn}
            onPress={handleNext}
            disabled={!(recordedSegments?.length)}
          >
            <Text
              style={[
                stylesheet.nextBtnText,
                { color: recordedSegments?.length ? colors.primary : colors.textMuted },
              ]}
            >
              Next
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  permText: { color: "#fff", fontSize: 16, marginBottom: 16 },
  permBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
  },
  permBtnText: { color: "#fff", fontWeight: "700" },
});

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    backBtn: {
      position: "absolute",
      left: spacing.md,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    progressBar: {
      position: "absolute",
      left: spacing.md,
      right: spacing.md,
      height: 3,
      flexDirection: "row",
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 2,
      overflow: "hidden",
      zIndex: 5,
    },
    progressSegment: {
      height: "100%",
      backgroundColor: "#fff",
    },
    progressSegmentActive: {
      backgroundColor: "#ef4444",
    },
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      paddingHorizontal: spacing.lg,
    },
    recordRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      maxWidth: 360,
    },
    soundPlaceholder: { width: 60 },
    nextBtn: { paddingVertical: 12, paddingHorizontal: 20 },
    nextBtnText: { fontSize: 16, fontWeight: "700" },
  });
}
