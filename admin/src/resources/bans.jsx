import { useState, useEffect } from "react";
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  useDataProvider,
  useNotify,
  useRefresh,
} from "react-admin";
import {
  Box,
  Drawer,
  Typography,
  Button,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
} from "@mui/material";
import { X, UserMinus, Trash2 } from "lucide-react";
import { adminApi } from "../lib/api";
import UserContentPreview from "../components/UserContentPreview";

const TYPE_LABELS = {
  USER: "User",
  PHONE: "Phone",
  DEVICE: "Device",
  DOC_HASH: "Doc Hash",
};

function BanDetailDrawer({ record, onClose, onSuccess }) {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const [unbanLoading, setUnbanLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userLoading, setUserLoading] = useState(false);

  if (!record) return null;

  const banType = record.type ?? "USER";
  const valueHash = record.value_hash ?? record.valueHash ?? "";
  const isUserBan = banType === "USER";
  // value_hash may be user ID (moderation) or hash (form-created); only fetch when it looks like numeric ID
  const maybeUserId = isUserBan ? parseInt(valueHash, 10) : null;
  const userId = maybeUserId > 0 && !isNaN(maybeUserId) ? String(maybeUserId) : null;

  // Fetch user data when drawer opens for USER type with numeric ID
  useEffect(() => {
    if (!userId) return;
    setUserLoading(true);
    adminApi
      .getUserFullData(userId)
      .then((r) => {
        const u = r?.data?.mysql?.user ?? r?.data;
        setUserData(u || null);
      })
      .catch(() => setUserData(null))
      .finally(() => setUserLoading(false));
  }, [userId]);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const handleUnban = async () => {
    if (!userId) return;
    setUnbanLoading(true);
    try {
      await adminApi.unbanUser(userId);
      notify("User unbanned successfully", { type: "success" });
      refresh();
      onSuccess?.();
    } catch (e) {
      notify(e?.response?.data?.message || e?.message || "Unban failed", { type: "error" });
    } finally {
      setUnbanLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!record.id) return;
    setDeleteLoading(true);
    try {
      await dataProvider.delete("bans", { id: record.id, previousData: record });
      notify("Ban removed", { type: "success" });
      refresh();
      onSuccess?.();
    } catch (e) {
      notify(e?.message || "Delete failed", { type: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

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
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 520 },
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={600}>
          Ban #{record.id}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </Box>
      <Divider />
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <InfoRow label="Type" value={TYPE_LABELS[banType] ?? banType} />
        <InfoRow
          label={isUserBan ? "User ID" : "Value (hash)"}
          value={isUserBan ? `#${valueHash}` : valueHash}
        />
        <InfoRow label="Reason" value={record.reason} />
        <InfoRow label="Created by" value={record.created_by ?? record.createdBy} />
        <InfoRow label="Created at" value={formatDate(record.created_at ?? record.createdAt)} />
      </Box>

      {isUserBan && userId && (
        <Box sx={{ px: 2, pb: 2, flex: 1, minHeight: 0, overflow: "auto" }}>
          {userLoading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={32} />
            </Box>
          ) : userData ? (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    overflow: "hidden",
                    flexShrink: 0,
                    bgcolor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {userData.avatar_url || userData.avatarUrl ? (
                    <Box
                      component="img"
                      src={userData.avatar_url ?? userData.avatarUrl}
                      alt=""
                      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <Typography sx={{ fontSize: 20, fontWeight: 700, color: "text.secondary" }}>
                      {(userData.display_name ?? userData.displayName ?? userData.full_name ?? userData.fullName ?? "?")[0]?.toUpperCase()}
                    </Typography>
                  )}
                </Box>
                <Box minWidth={0}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {userData.display_name ?? userData.displayName ?? userData.full_name ?? userData.fullName ?? "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {userData.phone_number ?? userData.phoneNumber ?? userData.email ?? "—"}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, textTransform: "uppercase", letterSpacing: 0.5 }} color="text.secondary">
                Account details
              </Typography>
              <UserContentPreview user={userData} />
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Could not load user data
            </Typography>
          )}
        </Box>
      )}

      <Divider sx={{ flexShrink: 0 }} />
      <Box sx={{ p: 2, display: "flex", gap: 1, flexWrap: "wrap", flexShrink: 0 }}>
        {isUserBan && userId && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<UserMinus size={18} />}
            onClick={handleUnban}
            disabled={unbanLoading}
          >
            {unbanLoading ? "Unbanning…" : "Unban user"}
          </Button>
        )}
        <Button
          variant="outlined"
          color="error"
          startIcon={<Trash2 size={18} />}
          onClick={handleDelete}
          disabled={deleteLoading}
        >
          {deleteLoading ? "Deleting…" : "Delete ban"}
        </Button>
      </Box>
    </Drawer>
  );
}

function BansDatagridWithDrawer() {
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
        <TextField source="id" label="ID" />
        <TextField source="type" label="Type" />
        <TextField source="value_hash" label="Value" />
        <TextField source="reason" label="Reason" />
        <TextField source="created_by" label="Created by" />
        <DateField source="created_at" label="Created" showTime />
      </Datagrid>
      {selectedRecord && (
        <BanDetailDrawer
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSuccess={() => setSelectedRecord(null)}
        />
      )}
    </>
  );
}

export const BanList = () => (
  <List perPage={25} sx={{ "& .RaList-main .MuiPaper-root": { borderRadius: 2 } }}>
    <BansDatagridWithDrawer />
  </List>
);

export const BanCreate = () => (
  <Create>
    <SimpleForm>
      <SelectInput
        source="type"
        choices={[
          { id: "USER", name: "User (by ID)" },
          { id: "PHONE", name: "Phone number" },
          { id: "DEVICE", name: "Device" },
          { id: "DOC_HASH", name: "Doc Hash" },
        ]}
      />
      <TextInput
        source="value"
        label="Value"
        helperText="User ID (e.g. 42), phone number (e.g. +961...), device ID, or doc hash. For USER this also sets is_banned on the user."
      />
      <TextInput source="reason" label="Reason" />
    </SimpleForm>
  </Create>
);
