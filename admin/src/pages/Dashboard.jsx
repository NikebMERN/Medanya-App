import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button, useDataProvider } from "react-admin";
import { Card, CardContent, Typography } from "@mui/material";

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

export default function Dashboard() {
  const [counts, setCounts] = React.useState(null);
  const dataProvider = useDataProvider();

  React.useEffect(() => {
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

    fetch("/api/admin/moderation/counts", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("medanya_admin_token")}`,
      },
    })
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

    fetch("/api/admin/kyc?status=pending_manual&limit=1", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("medanya_admin_token")}`,
      },
    })
      .then((res) => res.json())
      .then((d) => {
        if (d.success)
          setCounts((c) => ({ ...c, pendingKyc: d.total ?? 0 }));
      })
      .catch(() => {});
  }, [dataProvider]);

  const navigate = useNavigate();
  const c = counts ?? {};

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Medanya Admin
        </Typography>
        <Typography color="textSecondary" variant="body2" sx={{ mb: 2 }}>
          Queue-based moderation • Ban hammer
        </Typography>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <CardWithLink title="Pending moderation" value={c.pending} to="/moderationQueue" />
          <CardWithLink title="Urgent items" value={c.urgent} to="/moderationQueue" />
          <CardWithLink title="Pending KYC" value={c.pendingKyc} to="/kycSubmissions" />
          <CardWithLink title="Banned users" value={c.bannedUsers} />
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
  );
}
