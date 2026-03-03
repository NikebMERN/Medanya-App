import {
  List,
  Datagrid,
  TextField,
  DateField,
  SelectInput,
  useRecordContext,
  Button,
} from "react-admin";
import { useNavigate } from "react-router-dom";
import { Chip, Box } from "@mui/material";

function PriorityField() {
  const record = useRecordContext();
  if (!record) return null;
  const v = record.priority || "NORMAL";
  const color = v === "URGENT" ? "error" : v === "HIGH" ? "warning" : "default";
  return <Chip label={v} size="small" color={color} sx={{ fontWeight: 600 }} />;
}

function PreviewField() {
  const record = useRecordContext();
  if (!record) return null;
  const c = record.content;
  const title = c?.title ?? c?.caption ?? c?.fullName ?? c?.displayName ?? c?.display_name ?? "—";
  const avatarUrl = c?.avatarUrl ?? c?.avatar_url;
  const isUser = record.targetType === "USER";
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, maxWidth: 260 }}>
      {isUser && avatarUrl && (
        <Box
          component="img"
          src={avatarUrl}
          alt=""
          sx={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
      )}
      <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={String(title)}>
        {String(title).slice(0, 40)}
        {String(title).length > 40 ? "…" : ""}
      </Box>
    </Box>
  );
}

function ViewButton() {
  const record = useRecordContext();
  const navigate = useNavigate();
  return (
    <Button
      size="small"
      label="View"
      variant="outlined"
      onClick={(e) => {
        e.stopPropagation();
        if (record?.id) navigate(`/moderationQueue/${encodeURIComponent(record.id)}/show`);
      }}
    />
  );
}

const ModerationFilters = [
  <SelectInput key="status" source="status" choices={[
    { id: "PENDING", name: "Pending" },
    { id: "ACTIONED", name: "Actioned" },
  ]} alwaysOn />,
  <SelectInput key="targetType" source="targetType" choices={[
    { id: "JOB", name: "Job" },
    { id: "MARKET_ITEM", name: "Market" },
    { id: "VIDEO", name: "Video" },
    { id: "LIVESTREAM", name: "Livestream" },
    { id: "MISSING_PERSON", name: "Missing" },
    { id: "USER", name: "User" },
  ]} />,
  <SelectInput key="priority" source="priority" choices={[
    { id: "URGENT", name: "Urgent" },
    { id: "HIGH", name: "High" },
    { id: "NORMAL", name: "Normal" },
  ]} />,
];

export const ModerationQueueList = () => (
  <List
    filters={ModerationFilters}
    filterDefaultValues={{ status: "PENDING" }}
    perPage={25}
    sx={{ "& .RaList-main": { "& .MuiPaper-root": { borderRadius: 2 } } }}
  >
    <Datagrid
      rowClick="show"
      sx={{
        "& .RaDatagrid-headerCell": { fontWeight: 700 },
        "& .RaDatagrid-rowCell": { py: 1.5 },
      }}
    >
      <TextField source="targetType" label="Type" />
      <TextField source="targetId" label="ID" />
      <PreviewField label="Preview" />
      <PriorityField label="Priority" />
      <TextField source="reportCount24h" label="Reports 24h" />
      <TextField source="reasonSummary" label="Top reasons" />
      <DateField source="createdAt" label="Created" showTime />
      <ViewButton label="Actions" />
    </Datagrid>
  </List>
);
