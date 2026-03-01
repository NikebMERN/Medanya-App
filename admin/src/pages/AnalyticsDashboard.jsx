/**
 * Analytics Dashboard — Full analytics overview with graphs.
 * Cards: total views, active users, uploads, sales, reports.
 * Area chart with range filter (7/28/90 days).
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../lib/api";
import { Card, CardContent, Typography, CircularProgress, Alert } from "@mui/material";
import { AnalyticsAreaChart } from "../components/AnalyticsAreaChart";

function fetchWithAuth(path) {
  const base = import.meta.env?.VITE_API_URL || "";
  const url = path.startsWith("/") ? `${base}${path}` : `${base}/api${path}`;
  const token = localStorage.getItem("medanya_admin_token") || sessionStorage.getItem("medanya_admin_token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return fetch(url, { headers }).then((r) => r.json());
}

const METRIC_OPTIONS = [
  { key: "views", label: "Views", totalsKey: "totalViews" },
  { key: "activeUsers", label: "Active users", totalsKey: "activeUsers" },
  { key: "uploads", label: "Uploads", totalsKey: "uploads" },
  { key: "purchases", label: "Sales", totalsKey: "marketplaceSales" },
  { key: "reports", label: "Reports", totalsKey: "reportsCount" },
];

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [range, setRange] = React.useState(28);
  const [metricKey, setMetricKey] = React.useState("views");

  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", "admin", "overview", range],
    queryFn: () => fetchWithAuth(`/api/analytics/admin/overview?range=${range}`),
    enabled: true,
  });

  const totals = data?.totals ?? {};
  const series = data?.series ?? [];
  const percentChange = 0; // Could compute from prev period if API returns it

  if (error) {
    return (
      <div className="p-4">
        <Alert severity="error">Failed to load analytics. {error?.message}</Alert>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl">
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Analytics Overview
      </Typography>
      <Typography color="textSecondary" variant="body2" sx={{ mb: 3 }}>
        App-wide metrics. Last {range} days.
      </Typography>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <CircularProgress />
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
            <Card sx={{ minWidth: 140, flex: 1 }}>
              <CardContent>
                <Typography color="textSecondary" variant="body2">Total views</Typography>
                <Typography variant="h4" fontWeight={600}>{totals.totalViews?.toLocaleString() ?? "—"}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 140, flex: 1 }}>
              <CardContent>
                <Typography color="textSecondary" variant="body2">Active users</Typography>
                <Typography variant="h4" fontWeight={600}>{totals.activeUsers?.toLocaleString() ?? "—"}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 140, flex: 1 }}>
              <CardContent>
                <Typography color="textSecondary" variant="body2">Uploads</Typography>
                <Typography variant="h4" fontWeight={600}>{totals.uploads?.toLocaleString() ?? "—"}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 140, flex: 1 }}>
              <CardContent>
                <Typography color="textSecondary" variant="body2">Marketplace sales</Typography>
                <Typography variant="h4" fontWeight={600}>{totals.marketplaceSales?.toLocaleString() ?? "—"}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 140, flex: 1 }}>
              <CardContent>
                <Typography color="textSecondary" variant="body2">Reports</Typography>
                <Typography variant="h4" fontWeight={600}>{totals.reportsCount?.toLocaleString() ?? "—"}</Typography>
              </CardContent>
            </Card>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {METRIC_OPTIONS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetricKey(m.key)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #e0e0e0",
                  background: metricKey === m.key ? "#2E6BFF" : "#fff",
                  color: metricKey === m.key ? "#fff" : "#333",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <AnalyticsAreaChart
            title={`${METRIC_OPTIONS.find((m) => m.key === metricKey)?.label ?? metricKey} — ${(totals[METRIC_OPTIONS.find((m) => m.key === metricKey)?.totalsKey ?? "totalViews"] ?? 0).toLocaleString()} total`}
            subtitle={`Last ${range} days`}
            seriesKey={metricKey}
            data={series}
            range={range}
            onRangeChange={setRange}
            height={300}
          />
        </>
      )}
    </div>
  );
}
