/**
 * InsightsAreaChart — Area + line + fill, tooltip on tap, skeleton loading.
 * Medanya style: gradient fill, date X-axis, count Y-axis.
 */
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  ViewStyle,
} from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { useThemeColors } from "../../theme/useThemeColors";
import { radii } from "../../theme/designSystem";
import { spacing } from "../../theme/spacing";

const CHART_HEIGHT = 180;
const PADDING = { top: 8, right: 8, bottom: 24, left: 36 };

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function InsightsAreaChart({
  data = [],
  seriesKey = "views",
  loading = false,
  style,
}) {
  const colors = useThemeColors();
  const { width } = Dimensions.get("window");
  const chartWidth = width - spacing.lg * 2 - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const [tooltip, setTooltip] = useState(null);

  const { areaPath, linePath, maxVal, points, labels } = useMemo(() => {
    const arr = Array.isArray(data) ? data : [];
    if (arr.length === 0) return { areaPath: "", linePath: "", maxVal: 1, points: [], labels: [] };
    const values = arr.map((d) => Number(d[seriesKey]) || 0);
    const maxVal = Math.max(1, ...values);
    const stepX = arr.length > 1 ? chartWidth / (arr.length - 1) : chartWidth;
    const labels = arr.map((d) => formatDate(d.date));
    const points = arr.map((d, i) => ({
      x: PADDING.left + i * stepX,
      y: PADDING.top + innerHeight - (innerHeight * ((d[seriesKey] || 0) / maxVal)),
      ...d,
    }));
    let areaPath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) areaPath += ` L ${points[i].x} ${points[i].y}`;
    areaPath += ` L ${points[points.length - 1].x} ${PADDING.top + innerHeight} L ${points[0].x} ${PADDING.top + innerHeight} Z`;
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) linePath += ` L ${points[i].x} ${points[i].y}`;
    return { areaPath, linePath, maxVal, points, labels };
  }, [data, seriesKey, chartWidth, innerHeight]);

  const onPress = useCallback(
    (e) => {
      const touchX = e.nativeEvent?.locationX ?? 0;
      if (points.length === 0) return;
      const idx = Math.round(
        ((touchX - PADDING.left) / chartWidth) * (points.length - 1)
      );
      const i = Math.max(0, Math.min(idx, points.length - 1));
      const p = points[i];
      setTooltip({
        date: formatDate(p.date),
        value: (p[seriesKey] ?? 0).toLocaleString(),
      });
      setTimeout(() => setTooltip(null), 2500);
    },
    [points, chartWidth, seriesKey]
  );

  if (loading) {
    return (
      <View style={[styles.skeleton, { height: CHART_HEIGHT }, style]}>
        <View style={[styles.skeletonBar, { width: "60%", backgroundColor: colors.border + "40" }]} />
        <View style={[styles.skeletonBar, { width: "80%", backgroundColor: colors.border + "30", marginTop: 8 }]} />
        <View style={[styles.skeletonBar, { width: "50%", backgroundColor: colors.border + "40", marginTop: 8 }]} />
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={[styles.empty, { height: CHART_HEIGHT }, style]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No data for this period</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {tooltip && (
        <View style={[styles.tooltip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.tooltipDate, { color: colors.text }]}>{tooltip.date}</Text>
          <Text style={[styles.tooltipValue, { color: colors.primary }]}>{tooltip.value}</Text>
        </View>
      )}
      <Pressable onPress={onPress} style={styles.pressable}>
        <Svg width={width - spacing.lg * 2} height={CHART_HEIGHT} style={styles.svg}>
          <Defs>
            <LinearGradient id="areaGradInsights" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity={0.4} />
              <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill="url(#areaGradInsights)" />
          <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth={2} />
        </Svg>
      </Pressable>
      <View style={styles.xAxis}>
        {labels
          .filter((_, i) => i % Math.max(1, Math.floor(labels.length / 5)) === 0)
          .map((l, i) => (
            <Text key={i} style={[styles.xLabel, { color: colors.textMuted }]} numberOfLines={1}>
              {l}
            </Text>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: spacing.lg, position: "relative" },
  svg: { alignSelf: "center" },
  pressable: { width: "100%" },
  empty: { justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 14 },
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: PADDING.left,
  },
  xLabel: { fontSize: 11 },
  tooltip: {
    position: "absolute",
    top: 8,
    left: spacing.lg + PADDING.left,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.input,
    borderWidth: 1,
    zIndex: 10,
    minWidth: 100,
  },
  tooltipDate: { fontSize: 12, fontWeight: "600" },
  tooltipValue: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  skeleton: {
    marginHorizontal: spacing.lg,
    justifyContent: "center",
    paddingHorizontal: PADDING.left,
  },
  skeletonBar: {
    height: 12,
    borderRadius: 4,
  },
});
