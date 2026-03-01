import React, { useCallback, useRef, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { useThemeColors } from "../../../theme/useThemeColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TICK_WIDTH = 48;
const MIN = 1;
const MAX = 99999;

function triggerHaptic() {
  try {
    require("expo-haptics").selectionAsync?.();
  } catch (_) {}
}

export function RulerSlider({ value, onValueChange, min = MIN, max = MAX }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const scrollRef = useRef(null);
  const lastVal = useRef(value);

  useEffect(() => {
    const x = (value - min) * TICK_WIDTH;
    scrollRef.current?.scrollTo({ x, animated: false });
  }, []);

  const onScroll = useCallback(
    (e) => {
      const x = e.nativeEvent.contentOffset.x;
      const tickIndex = Math.round(x / TICK_WIDTH);
      const v = Math.min(max, Math.max(min, min + tickIndex));
      if (v !== lastVal.current) {
        lastVal.current = v;
        triggerHaptic();
        onValueChange?.(v);
      }
    },
    [min, max, onValueChange]
  );

  const range = Math.min(500, max - min + 1);
  const values = Array.from({ length: range }, (_, i) => min + i);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={TICK_WIDTH}
        snapToAlignment="start"
        contentContainerStyle={styles.scrollContent}
        onMomentumScrollEnd={onScroll}
        onScrollEndDrag={onScroll}
      >
        {values.map((v) => (
          <View key={v} style={[styles.tick, v === value && styles.tickActive]}>
            <Text style={[styles.tickLabel, v === value && styles.tickLabelActive]}>{v}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { height: 60 },
    scrollContent: { paddingHorizontal: SCREEN_WIDTH / 2 - TICK_WIDTH / 2 },
    tick: { width: TICK_WIDTH, alignItems: "center", justifyContent: "center", height: 60 },
    tickActive: { transform: [{ scale: 1.2 }] },
    tickLabel: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
    tickLabelActive: { color: colors.primary, fontWeight: "800" },
  });
}
