/**
 * AnalyticsAreaChart — White card, title, subtitle, gradient area chart.
 * Medanya style: clean gradient fill below line, date X-axis, count Y-axis.
 */
import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, Typography, ToggleButtonGroup, ToggleButton } from "@mui/material";

const formatDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function AnalyticsAreaChart({
  title,
  subtitle,
  seriesKey = "views",
  data = [],
  height = 280,
  range,
  onRangeChange,
  seeAllHref,
  dark = false,
}) {
  const chartData = React.useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.map((d) => ({
      ...d,
      dateLabel: formatDate(d.date),
    }));
  }, [data]);

  const gradientId = React.useId?.() ? `grad-${React.useId()}` : `grad-${Math.random().toString(36).slice(2)}`;

  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: 1,
        bgcolor: dark ? "grey.900" : "white",
        color: dark ? "grey.100" : "grey.900",
      }}
    >
      <CardContent sx={{ pb: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <Typography variant="h6" fontWeight={700}>
              {title}
            </Typography>
            <Typography variant="body2" color={dark ? "grey.400" : "grey.600"}>
              {subtitle}
            </Typography>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {onRangeChange && (
              <ToggleButtonGroup
                size="small"
                value={range ?? 28}
                exclusive
                onChange={(_, v) => v != null && onRangeChange(v)}
              >
                <ToggleButton value={7}>7d</ToggleButton>
                <ToggleButton value={28}>28d</ToggleButton>
                <ToggleButton value={90}>90d</ToggleButton>
              </ToggleButtonGroup>
            )}
            {seeAllHref && (
              <a href={seeAllHref} style={{ fontSize: 14, color: "#2E6BFF", fontWeight: 600, textDecoration: "none" }}>
                See all
              </a>
            )}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2E6BFF" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#2E6BFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} stroke={dark ? "grey.400" : "grey.600"} />
            <YAxis tick={{ fontSize: 12 }} stroke={dark ? "grey.400" : "grey.600"} />
            <Tooltip
              formatter={(v) => [Number(v).toLocaleString(), seriesKey]}
              labelFormatter={(l) => l}
              contentStyle={{ borderRadius: 8 }}
            />
            <Area
              type="monotone"
              dataKey={seriesKey}
              stroke="#2E6BFF"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
