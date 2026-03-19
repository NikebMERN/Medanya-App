/**
 * DocumentFrameOverlay - Rounded rectangle frame + dimmed outside mask + instruction text.
 * For non-Veriff photo capture (e.g. manual KYC doc upload or custom camera flows).
 * Uses expo-camera.
 */
import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { CameraView } from "expo-camera";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const FRAME_WIDTH = SCREEN_WIDTH * 0.88;
const FRAME_HEIGHT = FRAME_WIDTH * 0.63;
const FRAME_RADIUS = 16;
const MASK_COLOR = "rgba(0,0,0,0.5)";

const FRAME_TOP = (SCREEN_HEIGHT - FRAME_HEIGHT) / 2 - 40;
const FRAME_LEFT = (SCREEN_WIDTH - FRAME_WIDTH) / 2;

export default function DocumentFrameOverlay({
  instruction = "Position your ID within the frame",
  style,
  ...cameraProps
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={[styles.container, style]}>
      <CameraView style={StyleSheet.absoluteFill} {...cameraProps} />
      {/* Dimmed mask: 4 rectangles around the frame */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
        <View style={[styles.maskTop, { backgroundColor: MASK_COLOR }]} />
        <View style={[styles.maskBottom, { backgroundColor: MASK_COLOR }]} />
        <View style={[styles.maskLeft, { backgroundColor: MASK_COLOR }]} />
        <View style={[styles.maskRight, { backgroundColor: MASK_COLOR }]} />
        <View style={[styles.frameBorder, { borderColor: colors.border }]} />
        <Text style={[styles.instruction, { color: colors.text }]}>
          {instruction}
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      overflow: "hidden",
    },
    maskTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: FRAME_TOP,
    },
    maskBottom: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: SCREEN_HEIGHT - FRAME_TOP - FRAME_HEIGHT,
    },
    maskLeft: {
      position: "absolute",
      top: FRAME_TOP,
      left: 0,
      width: FRAME_LEFT,
      height: FRAME_HEIGHT,
    },
    maskRight: {
      position: "absolute",
      top: FRAME_TOP,
      right: 0,
      width: SCREEN_WIDTH - FRAME_LEFT - FRAME_WIDTH,
      height: FRAME_HEIGHT,
    },
    frameBorder: {
      position: "absolute",
      top: FRAME_TOP,
      left: FRAME_LEFT,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      borderRadius: FRAME_RADIUS,
      borderWidth: 2,
      borderStyle: "solid",
    },
    instruction: {
      position: "absolute",
      bottom: spacing.xl * 3,
      left: spacing.lg,
      right: spacing.lg,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
  });
}
