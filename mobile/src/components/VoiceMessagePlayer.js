import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
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
  
  const [speedIndex, setSpeedIndex] = useState(0);
  const rate = SPEEDS[speedIndex];

  const player = useAudioPlayer(mediaUrl);
  const status = useAudioPlayerStatus(player);

  const playing = status.playing;
  const positionMillis = (status.currentTime || 0) * 1000;
  const durationMillis = (status.duration || 0) * 1000;
  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;

  const togglePlayPause = () => {
    if (playing) {
      player.pause();
    } else {
      player.playbackRate = rate;
      if (positionMillis >= durationMillis && durationMillis > 0) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const cycleSpeed = () => {
    const nextIdx = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(nextIdx);
    player.playbackRate = SPEEDS[nextIdx];
  };

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
