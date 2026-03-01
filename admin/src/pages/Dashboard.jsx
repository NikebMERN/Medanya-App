import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button, useDataProvider } from "react-admin";
import { Card, CardContent, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { AnalyticsAreaChart } from "../components/AnalyticsAreaChart";

const apiBase = () => import.meta.env?.VITE_API_URL || "";
const api = (path) => `${apiBase()}/api${path}`;
const fetchWithAuth = (path) => {
  const token = localStorage.getItem("medanya_admin_token") || sessionStorage.getItem("medanya_admin_token");
  return fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.json());
};

const CardWithLink = ({ title, value, to }) => {
  const navigate = useNavigate();
  return (
    <Card
      sx={{
        cursor: to ? "pointer" : "default",
        "&:hover": to ? { boxShadow: 2 } : {},
        minWidth: 160,
        flex: 1,
      }}
      onClick={() => to && navigate(to)}
    >
      <CardContent>
        <Typography color="textSecondary" variant="body2">
          {title}
        </Typography>
        <Typography variant="h4" component="p" sx={{ mt: 1, fontWeight: 600 }}>
          {value ?? "—"}
        </Typography>
      </CardContent>
    </Card>
  );
};

const adminApi = (path) => `${apiBase()}/api/admin${path}`;

export default function Dashboard() {
  const [counts, setCounts] = React.useState(null);
  const [mlRetrain, setMlRetrain] = React.useState({ pending: null, labeledCount: 0 });
  const [mlLoading, setMlLoading] = React.useState(false);
  const dataProvider = useDataProvider();

  const fetchMlRetrain = React.useCallback(() => {
    const token = localStorage.getItem("medanya_admin_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(adminApi("/ml/retrain-status"), { headers })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setMlRetrain({ pending: d.pending, labeledCount: d.labeledCount ?? 0 });
      })
      .catch(() => {});
  }, []);

  const doRequestRetrain = () => {
    setMlLoading(true);
    const token = localStorage.getItem("medanya_admin_token");
    const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    fetch(adminApi("/ml/request-retrain"), { method: "POST", headers })
      .then((r) => r.json())
      .then((d) => { setMlLoading(false); if (d.success) fetchMlRetrain(); else alert(d.error || "Failed"); })
      .catch(() => setMlLoading(false));
  };

  const doApproveRetrain = () => {
    setMlLoading(true);
    const token = localStorage.getItem("medanya_admin_token");
    const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    fetch(adminApi("/ml/approve-retrain"), { method: "POST", headers })
      .then((r) => r.json())
      .then((d) => { setMlLoading(false); if (d.success) { alert("Retrain approved – training started"); fetchMlRetrain(); } else alert(d.error || "Failed"); })
      .catch(() => setMlLoading(false));
  };

  const doRejectRetrain = () => {
    setMlLoading(true);
    const token = localStorage.getItem("medanya_admin_token");
    const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    fetch(adminApi("/ml/reject-retrain"), { method: "POST", headers })
      .then((r) => r.json())
      .then((d) => { setMlLoading(false); if (d.success) fetchMlRetrain(); })
      .catch(() => setMlLoading(false));
  };

  React.useEffect(() => {
    const token = localStorage.getItem("medanya_admin_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    dataProvider
      .getList("moderationQueue", {
        filter: { status: "PENDING" },
        pagination: { page: 1, perPage: 1 },
        sort: { field: "createdAt", order: "DESC" },
      })
      .then((r) => {
        setCounts((c) => ({ ...c, pending: r.total }));
        return dataProvider.getList("moderationQueue", {
          filter: { status: "PENDING", priority: "URGENT" },
          pagination: { page: 1, perPage: 1 },
          sort: { field: "createdAt", order: "DESC" },
        });
      })
      .then((r) => setCounts((c) => ({ ...c, urgent: r.total })))
      .catch(() => {});

    fetch(adminApi("/moderation/counts"), { headers })
      .then((res) => res.json())
      .then((d) => {
        if (d.success)
          setCounts((c) => ({
            ...c,
            pending: d.pending ?? c?.pending,
            urgent: d.urgent ?? c?.urgent,
            bannedUsers: d.bannedUsers,
          }));
      })
      .catch(() => {});

    fetch(adminApi("/kyc?status=pending_manual&limit=1"), { headers })
      .then((res) => res.json())
      .then((d) => {
        if (d.success)
          setCounts((c) => ({ ...c, pendingKyc: d.total ?? 0 }));
      })
      .catch(() => {});

    fetch(adminApi("/health"), { headers })
      .then((res) => res.json())
      .then((d) => {
        setCounts((c) => ({ ...c, serverOk: d?.ok === true }));
      })
      .catch(() => setCounts((c) => ({ ...c, serverOk: false })));

    fetch(adminApi("/users?page=1&limit=1"), { headers })
      .then((res) => res.json())
      .then((d) => {
        if (d.success && typeof d.total === "number")
          setCounts((c) => ({ ...c, totalUsers: d.total }));
      })
      .catch(() => {});
    fetchMlRetrain();
  }, [dataProvider, fetchMlRetrain]);

  const navigate = useNavigate();
  const c = counts ?? {};
  const [chartRange, setChartRange] = React.useState(28);
  const { data: analyticsData } = useQuery({
    queryKey: ["analytics-overview", chartRange],
    queryFn: () => fetchWithAuth(`/api/analytics/admin/overview?range=${chartRange}`),
    staleTime: 60000,
  });
  const analyticsTotals = analyticsData?.totals ?? {};
  const analyticsSeries = analyticsData?.series ?? [];

  return (
    <>
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Medanya Admin
        </Typography>
        <Typography color="textSecondary" variant="body2" sx={{ mb: 2 }}>
          Queue-based moderation • Ban hammer
        </Typography>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <CardWithLink title="Total users" value={c.totalUsers} to="/users" />
          <CardWithLink title="Pending moderation" value={c.pending} to="/moderationQueue" />
          <CardWithLink title="Urgent items" value={c.urgent} to="/moderationQueue" />
          <CardWithLink title="Pending KYC" value={c.pendingKyc} to="/kycSubmissions" />
          <CardWithLink title="Banned users" value={c.bannedUsers} />
          <CardWithLink title="Server status" value={c.serverOk === true ? "OK" : c.serverOk === false ? "Error" : "—"} />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            label="Moderation Queue"
            onClick={() => navigate("/moderationQueue")}
            variant="contained"
          />
          <Button
            label="KYC Review"
            onClick={() => navigate("/kycSubmissions")}
            variant="outlined"
          />
          <Button
            label="Users Search"
            onClick={() => navigate("/users")}
            variant="outlined"
          />
        </div>

      </CardContent>
    </Card>

    <Card sx={{ mt: 3 }}>
      <CardContent>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Typography variant="h6" fontWeight={700}>Insights</Typography>
          <Button label="See all" onClick={() => navigate("/analytics")} variant="text" size="small" sx={{ color: "#2E6BFF" }} />
        </div>
        <Typography color="textSecondary" variant="body2" sx={{ mb: 2 }}>Last {chartRange} days</Typography>
        <AnalyticsAreaChart
          title={`Total app views — ${(analyticsTotals.totalViews ?? 0).toLocaleString()}`}
          subtitle="App-wide views over time"
          seriesKey="views"
          data={analyticsSeries}
          range={chartRange}
          onRangeChange={setChartRange}
          height={260}
        />
      </CardContent>
    </Card>

    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Scam ML Retrain</Typography>
        <Typography color="textSecondary" variant="body2" sx={{ mb: 2 }}>
          Labeled samples: {mlRetrain.labeledCount}. Retrain runs only when you approve.
        </Typography>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {mlRetrain.pending ? (
            <>
              <Button label="Approve retrain" onClick={doApproveRetrain} variant="contained" color="primary" disabled={mlLoading} />
              <Button label="Reject" onClick={doRejectRetrain} variant="outlined" disabled={mlLoading} />
            </>
          ) : (
            <Button label="Request retrain" onClick={doRequestRetrain} variant="outlined" disabled={mlLoading || mlRetrain.labeledCount < 200} />
          )}
        </div>
      </CardContent>
    </Card>
    </>
  );
}
