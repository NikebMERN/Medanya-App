/**
 * UserShow — Redesigned user detail page with profile, stats, and "See user activities" panel.
 * Activities panel: reports table (time, reason), activity chart, by-module breakdown.
 */
import * as React from "react";
import { useParams } from "react-router-dom";
import { Show } from "react-admin";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Collapse,
  CircularProgress,
  Alert,
  Stack,
  Paper,
} from "@mui/material";
import { ArrowLeft, Activity, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { adminApi } from "../lib/api";
import { AnalyticsAreaChart } from "../components/AnalyticsAreaChart";

const fetchWithAuth = (path) => {
  const base = import.meta.env?.VITE_API_URL || "";
  const url = path.startsWith("/") ? `${base}${path}` : `${base}/api${path}`;
  const token = localStorage.getItem("medanya_admin_token") || sessionStorage.getItem("medanya_admin_token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return fetch(url, { headers }).then((r) => r.json());
};

function StatCard({ label, value, color = "primary", onClick }) {
  return (
    <Card
      variant="outlined"
      sx={{
        flex: 1,
        minWidth: 120,
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.2s, background-color 0.2s",
        "&:hover": onClick ? { boxShadow: 2 } : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography variant="h6" fontWeight={700} color={color}>
          {value ?? "—"}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function UserShow() {
  const { id } = useParams();
  const [showActivities, setShowActivities] = React.useState(false);
  const [activityRange, setActivityRange] = React.useState(28);
  const jobsRef = React.useRef(null);
  const listingsRef = React.useRef(null);
  const followingRef = React.useRef(null);
  const followersRef = React.useRef(null);
  const reportsRef = React.useRef(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "user-full", id],
    queryFn: () => adminApi.getUserFullData(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["admin", "user-activity", id, activityRange],
    queryFn: () => fetchWithAuth(`/api/analytics/admin/users/${id}/activity?range=${activityRange}`),
    enabled: !!id && showActivities,
  });

  const { mysql, mongo, risk } = data ?? {};
  const user = mysql?.user ?? {};
  const reportsAgainst = mongo?.reportsAgainst ?? [];
  const reportsBy = mongo?.reportsBy ?? [];
  const actSummary = activityData?.summary ?? {};
  const actSeries = activityData?.series ?? [];
  const byModule = activityData?.byModule ?? {};

  const formatDate = (d) => (d ? new Date(d).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : "—");

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const scrollToReports = () => {
    setShowActivities(true);
    setTimeout(() => reportsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  return (
    <Show
      resource="users"
      id={id}
      sx={{ "& .RaShow-main": { maxWidth: 960 } }}
    >
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : error || !data ? (
        <Alert severity="error">User not found or error loading data.</Alert>
      ) : (
        <Stack spacing={3}>
          {/* Header: back + primary action */}
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Button
              component={Link}
              to="/users"
              startIcon={<ArrowLeft size={18} />}
              variant="text"
              sx={{ color: "text.secondary", textTransform: "none", fontWeight: 500 }}
            >
              Back to users
            </Button>
          </Box>

          {/* Profile Card */}
          <Card variant="outlined" sx={{ overflow: "visible", borderRadius: 2 }}>
            <CardContent sx={{ "&:last-child": { pb: 3 } }}>
              <Box display="flex" flexWrap="wrap" gap={3} alignItems="flex-start">
                {user.avatar_url && (
                  <Box
                    component="img"
                    src={user.avatar_url}
                    alt=""
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: 1,
                      borderColor: "divider",
                    }}
                  />
                )}
                <Box flex={1} minWidth={0}>
                  <Typography variant="h5" fontWeight={700} gutterBottom>
                    {user.display_name || "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ID {user.id} · {user.phone_number || "—"}
                    {user.email ? ` · ${user.email}` : ""}
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1} mt={2} useFlexGap>
                    <Chip label={user.role ?? "—"} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
                    <Chip
                      label={user.otp_verified ? "OTP verified" : "OTP pending"}
                      size="small"
                      color={user.otp_verified ? "success" : "default"}
                      variant="outlined"
                    />
                    <Chip label={`KYC ${user.kyc_status ?? "—"}`} size="small" variant="outlined" />
                    {user.is_banned ? (
                      <Chip label="Banned" size="small" color="error" />
                    ) : (
                      <Chip label="Active" size="small" color="success" variant="outlined" />
                    )}
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Box display="flex" flexWrap="wrap" gap={2}>
            <StatCard label="Jobs" value={mysql?.jobs?.length ?? 0} onClick={() => scrollToSection(jobsRef)} />
            <StatCard label="Listings" value={mysql?.marketplaceItems?.length ?? 0} onClick={() => scrollToSection(listingsRef)} />
            <StatCard label="Following" value={mysql?.followsAsFollower?.length ?? 0} onClick={() => scrollToSection(followingRef)} />
            <StatCard label="Followers" value={mysql?.followsAsFollowing?.length ?? 0} onClick={() => scrollToSection(followersRef)} />
            <StatCard label="Reports against" value={reportsAgainst.length} color={reportsAgainst.length > 0 ? "error" : "primary"} onClick={scrollToReports} />
            <StatCard label="Reports by" value={reportsBy.length} onClick={scrollToReports} />
          </Box>

          {/* Primary action: Activities */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Button
                variant="contained"
                size="medium"
                startIcon={showActivities ? <ChevronUp size={20} /> : <Activity size={20} />}
                onClick={() => setShowActivities((s) => !s)}
                sx={{
                  minWidth: 220,
                  py: 1.25,
                  px: 2.5,
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  boxShadow: 0,
                  "&:hover": { boxShadow: 1 },
                }}
              >
                {showActivities ? "Hide activities" : "See user activities"}
              </Button>

              <Collapse in={showActivities}>
                <Box mt={3}>
                  {activityLoading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Stack spacing={3}>
                      {/* Activity Chart */}
                      <AnalyticsAreaChart
                        title={`Views — ${(actSummary.totalViews ?? 0).toLocaleString()} total`}
                        subtitle={actSummary.percentChangeViews != null ? `↑${actSummary.percentChangeViews}% vs previous period` : `Last ${activityRange} days`}
                        seriesKey="views"
                        data={actSeries}
                        range={activityRange}
                        onRangeChange={setActivityRange}
                        height={260}
                      />

                      {/* Reports Table */}
                      <Paper ref={reportsRef} variant="outlined" sx={{ overflow: "hidden" }}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ px: 2, py: 1.5, bgcolor: "grey.50" }}>
                          Reports — Time & Reason
                        </Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date & Time</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Reason</TableCell>
                              <TableCell>Target / Reporter</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {reportsAgainst.map((r, i) => (
                              <TableRow key={`against-${i}`}>
                                <TableCell>{formatDate(r.createdAt)}</TableCell>
                                <TableCell><Chip label="Against" size="small" color="error" variant="outlined" /></TableCell>
                                <TableCell>{r.reason ?? "—"}</TableCell>
                                <TableCell>By {r.reporterId ?? "—"}</TableCell>
                              </TableRow>
                            ))}
                            {reportsBy.map((r, i) => (
                              <TableRow key={`by-${i}`}>
                                <TableCell>{formatDate(r.createdAt)}</TableCell>
                                <TableCell><Chip label="By User" size="small" color="info" variant="outlined" /></TableCell>
                                <TableCell>{r.reason ?? "—"}</TableCell>
                                <TableCell>{r.targetType ?? "—"} #{r.targetId ?? "—"}</TableCell>
                              </TableRow>
                            ))}
                            {reportsAgainst.length === 0 && reportsBy.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 4, color: "text.secondary" }}>
                                  No reports
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </Paper>

                      {/* Activity by Module */}
                      {byModule && Object.keys(byModule).length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            Activity by module
                          </Typography>
                          <Box display="flex" flexWrap="wrap" gap={1}>
                            {Object.entries(byModule).map(([mod, info]) => (
                              <Chip
                                key={mod}
                                label={`${mod}: ${info?.count ?? 0} events`}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Stack>
                  )}
                </Box>
              </Collapse>
            </CardContent>
          </Card>

          {/* Collapsible raw data sections */}
          <Card ref={jobsRef} variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Jobs
              </Typography>
              {mysql?.jobs?.length ? (
                <Stack spacing={0.5} maxHeight={160} overflow="auto">
                  {mysql.jobs.map((j) => (
                    <Typography key={j.id} variant="body2">#{j.id} {j.title} — {j.status}</Typography>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No jobs</Typography>
              )}
            </CardContent>
          </Card>

          <Card ref={followingRef} variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Following
              </Typography>
              {mysql?.followsAsFollower?.length ? (
                <Stack spacing={0.5} maxHeight={120} overflow="auto">
                  {mysql.followsAsFollower.map((f, i) => (
                    <Typography key={i} variant="body2">→ User #{f.following_id ?? f.followingId ?? "—"}</Typography>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">None</Typography>
              )}
            </CardContent>
          </Card>

          <Card ref={followersRef} variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Followers
              </Typography>
              {mysql?.followsAsFollowing?.length ? (
                <Stack spacing={0.5} maxHeight={120} overflow="auto">
                  {mysql.followsAsFollowing.map((f, i) => (
                    <Typography key={i} variant="body2">← User #{f.follower_id ?? f.followerId ?? "—"}</Typography>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">None</Typography>
              )}
            </CardContent>
          </Card>

          <Card ref={listingsRef} variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Marketplace Listings
              </Typography>
              {mysql?.marketplaceItems?.length ? (
                <Stack spacing={0.5} maxHeight={160} overflow="auto">
                  {mysql.marketplaceItems.map((i) => (
                    <Typography key={i.id} variant="body2">#{i.id} {i.title} — {i.status}</Typography>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No listings</Typography>
              )}
            </CardContent>
          </Card>

          {risk && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Risk
                </Typography>
                <Typography component="pre" variant="caption" sx={{ overflow: "auto", display: "block", maxHeight: 200 }}>
                  {JSON.stringify(risk, null, 2)}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}
    </Show>
  );
}
