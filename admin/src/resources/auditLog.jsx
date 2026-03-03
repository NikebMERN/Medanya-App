import { useState } from "react";
import {
  List,
  Datagrid,
  TextField,
  DateField,
  SelectInput,
  useRecordContext,
  useNotify,
  useRefresh,
} from "react-admin";
import {
  Box,
  Drawer,
  Typography,
  Button,
  Chip,
  Stack,
  IconButton,
  Divider,
} from "@mui/material";
import { X, UserMinus } from "lucide-react";
import { adminApi } from "../lib/api";

const ACTION_LABELS = {
  hide: "Hide",
  restore: "Restore",
  delete: "Delete",
  ban_user: "Ban User",
  ban_phone: "Ban Phone",
};

const TARGET_LABELS = {
  JOB: "Job",
  VIDEO: "Video",
  USER: "User",
  MARKET_ITEM: "Market",
  LIVESTREAM: "Livestream",
  MISSING_PERSON: "Missing Person",
};

function parseMetadata(val) {
  if (!val) return {};
  if (typeof val === "object") return val;
  try {
    return typeof val === "string" ? JSON.parse(val) : {};
  } catch {
    return {};
  }
}

function ActionChip() {
  const record = useRecordContext();
  const action = record?.action_type ?? record?.actionType ?? "—";
  const label = ACTION_LABELS[action] ?? action;
  const color = action === "ban_user" || action === "ban_phone" ? "error" : action === "delete" ? "warning" : "default";
  return <Chip label={label} size="small" color={color} variant="outlined" sx={{ fontWeight: 600 }} />;
}

function TargetTypeChip() {
  const record = useRecordContext();
  const t = record?.target_type ?? record?.targetType ?? "—";
  const label = TARGET_LABELS[t] ?? t;
  return <Chip label={label} size="small" variant="outlined" />;
}

function MetadataPreview() {
  const record = useRecordContext();
  const meta = parseMetadata(record?.metadata_json ?? record?.metadataJson);
  const reason = meta?.reason;
  if (!reason) return <span style={{ color: "#888" }}>—</span>;
  const short = String(reason).slice(0, 40);
  return (
    <span title={String(reason)}>
      {short}
      {String(reason).length > 40 ? "…" : ""}
    </span>
  );
}

function AuditDetailDrawer({ record, onClose, onUnbanSuccess }) {
  const notify = useNotify();
  const refresh = useRefresh();
  const [unbanLoading, setUnbanLoading] = useState(false);

  if (!record) return null;

  const meta = parseMetadata(record.metadata_json ?? record.metadataJson);
  const canUnban =
    (record.action_type === "ban_user" || record.actionType === "ban_user") &&
    (record.target_type === "USER" || record.targetType === "USER");

  const handleRemoveBan = async () => {
    if (!canUnban) return;
    const targetId = record.target_id ?? record.targetId;
    if (!targetId) return;
    setUnbanLoading(true);
    try {
      await adminApi.unbanUser(targetId);
      notify("User unbanned successfully", { type: "success" });
      refresh();
      onUnbanSuccess?.();
    } catch (e) {
      notify(e?.response?.data?.message || e?.message || "Unban failed", { type: "error" });
    } finally {
      setUnbanLoading(false);
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const InfoRow = ({ label, value }) => (
    <Box sx={{ display: "flex", gap: 2, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120, fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
        {value ?? "—"}
      </Typography>
    </Box>
  );

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 420 } } }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" fontWeight={600}>
          Audit log #{record.id}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </Box>
      <Divider />
      <Box sx={{ p: 2 }}>
        <InfoRow label="Date" value={formatDate(record.created_at ?? record.createdAt)} />
        <InfoRow label="Admin ID" value={record.admin_id ?? record.adminId} />
        <InfoRow
          label="Action"
          value={ACTION_LABELS[record.action_type ?? record.actionType] ?? record.action_type ?? record.actionType}
        />
        <InfoRow
          label="Target type"
          value={TARGET_LABELS[record.target_type ?? record.targetType] ?? record.target_type ?? record.targetType}
        />
        <InfoRow label="Target ID" value={record.target_id ?? record.targetId} />

        {Object.keys(meta).length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: "uppercase" }}>
              Details
            </Typography>
            <Box sx={{ pl: 0 }}>
              {meta.reason != null && <InfoRow label="Reason" value={meta.reason} />}
              {meta.banLevel != null && <InfoRow label="Ban level" value={meta.banLevel} />}
              {Object.entries(meta)
                .filter(([k]) => !["reason", "banLevel"].includes(k))
                .map(([k, v]) => (
                  <InfoRow
                    key={k}
                    label={k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                    value={typeof v === "object" ? JSON.stringify(v) : String(v)}
                  />
                ))}
            </Box>
          </Box>
        )}

        {canUnban && (
          <Box sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<UserMinus size={18} />}
              onClick={handleRemoveBan}
              disabled={unbanLoading}
            >
              {unbanLoading ? "Removing…" : "Remove ban"}
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

const auditFilters = [
  <SelectInput key="actionType" source="actionType" choices={[
    { id: "hide", name: "Hide" },
    { id: "restore", name: "Restore" },
    { id: "delete", name: "Delete" },
    { id: "ban_user", name: "Ban User" },
    { id: "ban_phone", name: "Ban Phone" },
  ]} />,
  <SelectInput key="targetType" source="targetType" choices={[
    { id: "JOB", name: "Job" },
    { id: "VIDEO", name: "Video" },
    { id: "USER", name: "User" },
    { id: "MARKET_ITEM", name: "Market" },
  ]} />,
];

function AuditDatagridWithDrawer() {
  const [selectedRecord, setSelectedRecord] = useState(null);

  return (
    <>
      <Datagrid
        bulkActionButtons={false}
        rowClick={(id, resource, record) => setSelectedRecord(record)}
        sx={{
          "& .RaDatagrid-row": { cursor: "pointer" },
          "& .RaDatagrid-headerCell": { fontWeight: 700 },
        }}
      >
        <DateField source="created_at" label="Date" showTime />
        <TextField source="admin_id" label="Admin" />
        <ActionChip label="Action" />
        <TargetTypeChip label="Target" />
        <TextField source="target_id" label="Target ID" />
        <MetadataPreview label="Details" />
      </Datagrid>
      {selectedRecord && (
        <AuditDetailDrawer
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onUnbanSuccess={() => setSelectedRecord(null)}
        />
      )}
    </>
  );
}

export const AuditList = () => (
  <List filters={auditFilters} perPage={25} sx={{ "& .RaList-main .MuiPaper-root": { borderRadius: 2 } }}>
    <AuditDatagridWithDrawer />
  </List>
);
