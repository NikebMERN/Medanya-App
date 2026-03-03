import { useLocation } from "react-router-dom";
import { AppBar, TitlePortal } from "react-admin";
import { Box, Typography } from "@mui/material";

const ROUTE_LABELS = {
  "/": "Dashboard",
  "/users": "Users",
  "/moderationQueue": "Moderation Queue",
  "/reports": "Reports",
  "/kycSubmissions": "KYC Review",
  "/bans": "Bans",
  "/auditLog": "Audit Log",
};

function getCurrentScreenLabel(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const first = parts[0];
  const base = first ? `/${first}` : "/";
  return ROUTE_LABELS[base] ?? "Admin";
}

export function AdminAppBar() {
  const location = useLocation();
  const screenLabel = getCurrentScreenLabel(location.pathname);

  return (
    <AppBar color="primary" sx={{ "& .RaAppBar-title": { flex: 1 } }}>
      <TitlePortal />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 2 }}>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          —
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {screenLabel}
        </Typography>
      </Box>
    </AppBar>
  );
}
