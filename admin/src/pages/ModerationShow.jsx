import { useState } from "react";
import {
  Show,
  useShowController,
  useUpdate,
  useNotify,
  useRedirect,
  Button,
} from "react-admin";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Box,
  Chip,
  Divider,
  Link,
  Stack,
} from "@mui/material";
import UserContentPreview, { isUserContent } from "../components/UserContentPreview";

function maskPhone(p) {
  if (!p || typeof p !== "string") return "***";
  const d = p.replace(/\D/g, "");
  if (d.length < 4) return "***";
  return "*".repeat(d.length - 4) + d.slice(-4);
}

function maskReporter(id) {
  if (!id) return "***";
  const s = String(id);
  return s.length > 4 ? s.slice(0, 2) + "***" + s.slice(-2) : "***";
}

/** Render content object — full user layout when USER, else simple key-value */
function ContentPreview({ content }) {
  if (!content || typeof content !== "object") return null;
  if (isUserContent(content)) {
    return <UserContentPreview user={content} />;
  }
  const rows = [];
  const add = (label, val) => {
    if (val != null && val !== "" && (typeof val !== "object" || Array.isArray(val))) {
      rows.push({ label, value: Array.isArray(val) ? val.join(", ") : String(val) });
    }
  };
  add("Title", content.title);
  add("Display Name", content.displayName ?? content.display_name);
  add("Full Name", content.fullName ?? content.full_name);
  add("Caption", content.caption);
  add("Description", content.description);
  add("Bio", content.bio);
  add("Neighborhood", content.neighborhood);
  add("Phone", content.phone ?? content.phone_number);
  add("Status", content.status);
  add("Type", content.type);
  add("Category", content.category);
  if (rows.length === 0) {
    const skip = new Set(["avatarUrl", "avatar_url", "avatar", "mediaUrls", "photos", "videos", "evidence"]);
    Object.entries(content).forEach(([k, v]) => {
      if (skip.has(k) || v == null || v === "" || typeof v === "object") return;
      rows.push({ label: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()), value: String(v) });
    });
  }
  if (rows.length === 0) return null;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
      {rows.map((r) => (
        <Box key={r.label} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100, fontWeight: 500 }}>
            {r.label}:
          </Typography>
          <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
            {r.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function ModerationShow() {
  const { record, isLoading } = useShowController();
  const [update] = useUpdate();
  const notify = useNotify();
  const redirect = useRedirect();
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");

  const handleAction = (actionType, banLevel) => {
    if (!actionType) return;
    update(
      "moderationQueue",
      {
        id: record?.id,
        data: {
          actionType,
          reason: reason || "Moderation action",
          banLevel,
        },
      },
      {
        onSuccess: () => {
          notify("Action applied", { type: "success" });
          redirect("/moderationQueue");
        },
        onError: (e) => notify(e?.message || "Action failed", { type: "error" }),
      }
    );
  };

  if (isLoading || !record) return null;

  const queueItem = record.queueItem || record;
  const reports = record.reports || [];
  const content = record.content;
  const targetType = record.targetType || queueItem.targetType;
  const targetId = record.targetId || queueItem.targetId;

  const title =
    content?.title ??
    content?.caption ??
    content?.fullName ??
    content?.displayName ??
    `${targetType} #${targetId}`;

  const getMediaForReport = (r) => {
    const evidencePhotos = r.evidence?.photos && Array.isArray(r.evidence.photos) ? r.evidence.photos : [];
    const evidenceVideos = r.evidence?.videos && Array.isArray(r.evidence.videos) ? r.evidence.videos : [];
    const mediaUrls = r.mediaUrls && Array.isArray(r.mediaUrls) ? r.mediaUrls : [];
    const imgUrls = mediaUrls.filter((u) => typeof u === "string" && /\.(jpg|jpeg|png|gif|webp)/i.test(u));
    const vidUrls = mediaUrls.filter((u) => typeof u === "string" && /\.(mp4|webm|mov)/i.test(u));
    const otherUrls = mediaUrls.filter((u) => typeof u === "string" && !/\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)/i.test(u));
    return {
      photos: [...evidencePhotos, ...imgUrls],
      videos: [...evidenceVideos, ...vidUrls, ...otherUrls],
    };
  };

  return (
    <Show
      title={`Review: ${targetType} #${targetId}`}
      actions={false}
      component="div"
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 900 }}>
        {/* Content Preview */}
        <Card sx={{ borderRadius: 2, overflow: "hidden" }}>
          <CardContent sx={{ "&:last-child": { pb: 2 } }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Chip label={targetType} size="small" variant="outlined" />
              <Chip
                label={queueItem.priority || "NORMAL"}
                size="small"
                color={queueItem.priority === "URGENT" ? "error" : queueItem.priority === "HIGH" ? "warning" : "default"}
              />
              <Typography variant="body2" color="text.secondary">
                {queueItem.reportCount24h ?? 0} reports in 24h
              </Typography>
            </Stack>
            {content && (
              <Box sx={{ mt: 2 }}>
                {targetType === "USER" && (content.avatarUrl ?? content.avatar_url) && (
                  <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 2 }}>
                    <Box
                      component="img"
                      src={content.avatarUrl ?? content.avatar_url}
                      alt=""
                      sx={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: 1, borderColor: "divider" }}
                    />
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {content.displayName ?? content.display_name ?? content.fullName ?? content.full_name ?? title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {content.neighborhood ?? content.phone_number ?? content.phone ?? "—"}
                      </Typography>
                    </Box>
                  </Stack>
                )}
                <ContentPreview content={content} />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Reports Panel */}
        <Card sx={{ borderRadius: 2, overflow: "hidden" }}>
          <CardContent sx={{ "&:last-child": { pb: 2 } }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Reports ({reports.length})
            </Typography>
            {reports.length === 0 ? (
              <Typography color="text.secondary">No reports</Typography>
            ) : (
              <Stack spacing={2} divider={<Divider />}>
                {reports.map((r) => {
                  const { photos, videos } = getMediaForReport(r);
                  const hasMedia = photos.length > 0 || videos.length > 0;
                  return (
                    <Box key={r._id || r.id}>
                      <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="flex-start">
                        <Box sx={{ flex: "1 1 200px", minWidth: 0 }}>
                          <Typography variant="body2" color="text.secondary">
                            Reporter: {maskReporter(r.reporterId)} • {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{r.reason}</Typography>
                          {r.description && (
                            <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
                              {r.description}
                            </Typography>
                          )}
                        </Box>
                        {hasMedia && (
                          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }} useFlexGap>
                            {photos.map((url, idx) => (
                              <Link key={`p-${idx}`} href={url} target="_blank" rel="noopener" sx={{ display: "block" }}>
                                <Box
                                  component="img"
                                  src={url}
                                  alt=""
                                  sx={{ width: 64, height: 64, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider" }}
                                  onError={(e) => { e.target.style.display = "none"; }}
                                />
                              </Link>
                            ))}
                            {videos.map((url, idx) => (
                              <Link key={`v-${idx}`} href={url} target="_blank" rel="noopener">
                                <Box sx={{ width: 64, height: 64, borderRadius: 1, bgcolor: "grey.800", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "divider" }}>
                                  <Typography variant="caption">Video</Typography>
                                </Box>
                              </Link>
                            ))}
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Action Panel */}
        <Card sx={{ borderRadius: 2, overflow: "hidden" }}>
          <CardContent sx={{ "&:last-child": { pb: 2 } }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Actions
            </Typography>
            <TextField
              fullWidth
              label="Admin reason (required for bans)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Violates policy"
              sx={{ mb: 2 }}
              size="small"
              variant="outlined"
            />
            <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
              <Button
                label="Hide"
                onClick={() => handleAction("hide")}
                variant="outlined"
                color="warning"
              />
              <Button
                label="Restore"
                onClick={() => handleAction("restore")}
                variant="outlined"
              />
              <Button
                label="Delete"
                onClick={() => handleAction("delete")}
                variant="outlined"
                color="error"
              />
              {targetType === "LIVESTREAM" && (
                <Button
                  label="Stop Stream"
                  onClick={() => handleAction("hide")}
                  variant="outlined"
                />
              )}
              {targetType === "USER" && (
                <>
                  <Button
                    label="Soft Ban"
                    onClick={() => handleAction("ban_user", "soft")}
                    variant="outlined"
                    color="error"
                  />
                  <Button
                    label="Hard Ban"
                    onClick={() => handleAction("ban_user", "hard")}
                    variant="contained"
                    color="error"
                  />
                </>
              )}
              <Button
                label="Ban Phone"
                onClick={() => handleAction("ban_phone")}
                variant="outlined"
                color="error"
              />
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Show>
  );
}
