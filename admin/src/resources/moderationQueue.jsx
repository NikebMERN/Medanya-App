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
import { Chip } from "@mui/material";

function PriorityField() {
  const record = useRecordContext();
  if (!record) return null;
  const v = record.priority || "NORMAL";
  const color = v === "URGENT" ? "error" : v === "HIGH" ? "warning" : "default";
  return <Chip label={v} size="small" color={color} />;
}

function PreviewField() {
  const record = useRecordContext();
  if (!record) return null;
  const c = record.content;
  const title = c?.title ?? c?.caption ?? c?.fullName ?? c?.displayName ?? "—";
  return (
    <span
      style={{
        maxWidth: 200,
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "block",
      }}
      title={title}
    >
      {title}
    </span>
  );
}

function ViewButton() {
  const record = useRecordContext();
  const navigate = useNavigate();
  return (
    <Button
      size="small"
      label="View"
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
  >
    <Datagrid rowClick="show">
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
