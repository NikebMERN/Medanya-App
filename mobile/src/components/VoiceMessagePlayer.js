import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Audio } from "expo-av";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";
import { formatTime } from "../utils/format";

const BAR_COUNT = 24;
const SPEEDS = [1, 1.5, 2];

/**
 * Telegram-style voice message: play/pause, waveform-like bars, speed 1x / 1.5x / 2x.
 */
export default function VoiceMessagePlayer({ mediaUrl, isOwn, createdAt }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, isOwn), [colors, isOwn]);
  const [playing, setPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const soundRef = useRef(null);
  const intervalRef = useRef(null);

  const rate = SPEEDS[speedIndex];
  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;

  const stopProgressInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(async () => {
    const s = soundRef.current;
    if (!s) return;
    try {
      const st = await s.getStatusAsync();
      if (st?.isLoaded && st.positionMillis != null) {
        setPositionMillis(st.positionMillis);
        if (st.durationMillis != null) setDurationMillis(st.durationMillis);
        if (st.durationMillis != null && st.positionMillis >= st.durationMillis) {
          setPlaying(false);
          setPositionMillis(0);
          stopProgressInterval();
        }
      }
    } catch (_) {}
  }, [stopProgressInterval]);

  useEffect(() => {
    if (!mediaUrl) return;
    let s = null;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: mediaUrl },
          { shouldPlay: false }
        );
        soundRef.current = sound;
        const st = await sound.getStatusAsync();
        if (st?.isLoaded && st.durationMillis != null) {
          setDurationMillis(st.durationMillis);
        }
      } catch (_) {}
    })();
    return () => {
      stopProgressInterval();
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [mediaUrl, stopProgressInterval]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(updatePosition, 200);
      return () => stopProgressInterval();
    } else {
      stopProgressInterval();
    }
  }, [playing, updatePosition, stopProgressInterval]);

  const togglePlayPause = useCallback(async () => {
    const s = soundRef.current;
    if (!s) return;
    try {
      if (playing) {
        await s.pauseAsync();
        setPlaying(false);
      } else {
        await s.setRateAsync(rate, true);
        await s.playFromPositionAsync(positionMillis);
        setPlaying(true);
      }
    } catch (_) {
      setPlaying(false);
    }
  }, [playing, rate, positionMillis]);

  const cycleSpeed = useCallback(() => {
    setSpeedIndex((i) => (i + 1) % SPEEDS.length);
  }, []);

  useEffect(() => {
    const s = soundRef.current;
    if (!s || !playing) return;
    s.setRateAsync(rate, true).catch(() => {});
  }, [rate, playing]);

  const barHeights = Array.from({ length: BAR_COUNT }, (_, i) => {
    const t = i / BAR_COUNT;
    const peak = 0.3 + 0.7 * Math.sin(t * Math.PI);
    return Math.max(4, 20 * peak);
  });

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.playBtn} onPress={togglePlayPause} activeOpacity={0.8}>
        <MaterialIcons
          name={playing ? "pause" : "play-arrow"}
          size={28}
          color={isOwn ? "rgba(255,255,255,0.95)" : colors.primary}
        />
      </TouchableOpacity>
      <View style={styles.waveform}>
        {barHeights.map((h, i) => {
          const filled = i / BAR_COUNT <= progress;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: h,
                  backgroundColor: filled
                    ? isOwn
                      ? "rgba(255,255,255,0.9)"
                      : colors.primary
                    : isOwn
                      ? "rgba(255,255,255,0.35)"
                      : colors.textMuted + "60",
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.meta}>
        <Text style={styles.time}>
          {formatTime(createdAt)}
        </Text>
        <TouchableOpacity onPress={cycleSpeed} style={styles.speedBtn} hitSlop={8}>
          <Text style={styles.speedText}>{rate}x</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors, isOwn) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      minWidth: 160,
      paddingVertical: 4,
    },
    playBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.sm,
      backgroundColor: isOwn ? "rgba(255,255,255,0.2)" : colors.primary + "25",
    },
    waveform: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 24,
      gap: 2,
    },
    bar: {
      width: 3,
      borderRadius: 2,
    },
    meta: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: spacing.sm,
      gap: 6,
    },
    time: {
      fontSize: 11,
      color: isOwn ? "rgba(255,255,255,0.8)" : colors.textMuted,
    },
    speedBtn: {
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    speedText: {
      fontSize: 11,
      fontWeight: "700",
      color: isOwn ? "rgba(255,255,255,0.9)" : colors.textMuted,
    },
  });
}
