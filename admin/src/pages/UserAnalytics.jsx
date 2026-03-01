/**
 * UserAnalytics — User-specific analytics with chart, range, metric filters.
 */
import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Typography, CircularProgress, Alert, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { AnalyticsAreaChart } from "../components/AnalyticsAreaChart";

const METRIC_OPTIONS = [
  { key: "views", label: "Views" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "follows", label: "Followers" },
  { key: "sales", label: "Sales" },
  { key: "gifts", label: "Gifts" },
];

function fetchWithAuth(path) {
  const base = import.meta.env?.VITE_API_URL || "";
  const url = path.startsWith("/") ? `${base}${path}` : `${base}/api${path}`;
  const token = localStorage.getItem("medanya_admin_token") || sessionStorage.getItem("medanya_admin_token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return fetch(url, { headers }).then((r) => r.json());
}

export default function UserAnalytics() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [range, setRange] = React.useState(28);
  const [metricKey, setMetricKey] = React.useState("views");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "user-activity", userId, range],
    queryFn: () => fetchWithAuth(`/api/analytics/admin/users/${userId}/activity?range=${range}`),
    enabled: !!userId,
  });

  const summary = data?.summary ?? {};
  const series = data?.series ?? [];
  const byModule = data?.byModule ?? {};

  const metricTotal = {
    views: summary.totalViews ?? 0,
    likes: summary.totalLikes ?? 0,
    comments: summary.totalComments ?? 0,
    follows: summary.totalFollows ?? 0,
    sales: summary.totalMarketSalesUSD ?? 0,
    gifts: summary.totalGiftsCoins ?? 0,
  }[metricKey];

  if (error) {
    return (
      <div className="p-4">
        <button type="button" onClick={() => navigate(-1)} className="mb-4">
          ← Back
        </button>
        <Alert severity="error">Failed to load user analytics. {error?.message}</Alert>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 text-slate-600 hover:text-slate-900"
      >
        ← Back
      </button>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        User Analytics — {userId}
      </Typography>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <CircularProgress />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <ToggleButtonGroup
              size="small"
              value={range}
              exclusive
              onChange={(_, v) => v != null && setRange(v)}
            >
              <ToggleButton value={7}>7d</ToggleButton>
              <ToggleButton value={28}>28d</ToggleButton>
              <ToggleButton value={90}>90d</ToggleButton>
            </ToggleButtonGroup>
            <div className="flex flex-wrap gap-2 ml-4">
              {METRIC_OPTIONS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMetricKey(m.key)}
                  className={`px-3 py-1 rounded text-sm font-medium ${metricKey === m.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <AnalyticsAreaChart
            title={`${METRIC_OPTIONS.find((m) => m.key === metricKey)?.label ?? metricKey} — ${Number(metricTotal).toLocaleString()} total`}
            subtitle={summary.percentChangeViews != null ? `↑${summary.percentChangeViews}% from previous period` : `Last ${range} days`}
            seriesKey={metricKey}
            data={series}
            range={range}
            onRangeChange={setRange}
            height={300}
          />

          {byModule && Object.keys(byModule).length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Activity by module</Typography>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(byModule).map(([mod, info]) => (
                    <div key={mod} className="p-2 bg-slate-50 rounded">
                      <span className="font-medium capitalize">{mod}</span>: {info?.count ?? 0} events
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
