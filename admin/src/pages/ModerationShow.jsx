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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

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

  return (
    <Show
      title={`Review: ${targetType} #${targetId}`}
      actions={false}
      component="div"
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Left: Content Preview */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Content Preview
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Type: <Chip label={targetType} size="small" /> • Priority:{" "}
              <Chip
                label={queueItem.priority || "NORMAL"}
                size="small"
                color={queueItem.priority === "URGENT" ? "error" : "default"}
              />{" "}
              • Reports 24h: {queueItem.reportCount24h ?? 0}
            </Typography>
            {content && (
              <Box sx={{ mt: 2, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
                  {JSON.stringify(content, null, 2)}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Right: Reports Panel */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Reports
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Reporter (masked)</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>No reports</TableCell>
                  </TableRow>
                ) : (
                  reports.map((r) => (
                    <TableRow key={r._id || r.id}>
                      <TableCell>{maskReporter(r.reporterId)}</TableCell>
                      <TableCell>{r.reason}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.description ? String(r.description).slice(0, 80) + "…" : "—"}
                      </TableCell>
                      <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Bottom: Action Panel */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
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
            />
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
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
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Show>
  );
}
