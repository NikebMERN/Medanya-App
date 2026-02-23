import {
  List,
  Datagrid,
  TextField,
  DateField,
  SelectInput,
  Button,
} from "react-admin";
import { useNavigate } from "react-router-dom";
import { useRecordContext } from "react-admin";

const reportFilters = [
  <SelectInput key="targetType" source="targetType" choices={[
    { id: "JOB", name: "Job" },
    { id: "MARKET_ITEM", name: "Market" },
    { id: "VIDEO", name: "Video" },
    { id: "USER", name: "User" },
    { id: "LIVESTREAM", name: "Livestream" },
    { id: "MISSING_PERSON", name: "Missing" },
  ]} />,
  <SelectInput key="status" source="status" choices={[
    { id: "OPEN", name: "Open" },
    { id: "RESOLVED", name: "Resolved" },
    { id: "DISMISSED", name: "Dismissed" },
  ]} />,
];

function OpenInModerationButton() {
  const record = useRecordContext();
  const navigate = useNavigate();
  if (!record) return null;
  const targetType = record.targetType;
  const targetId = record.targetId;
  const id = `${targetType}_${targetId}`;
  return (
    <Button
      size="small"
      label="Open in Moderation"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/moderationQueue/${encodeURIComponent(id)}/show`);
      }}
    />
  );
}

export const ReportList = () => (
  <List filters={reportFilters} perPage={25}>
    <Datagrid>
      <TextField source="targetType" label="Type" />
      <TextField source="targetId" label="Target ID" />
      <TextField source="reason" label="Reason" />
      <TextField source="status" label="Status" />
      <DateField source="createdAt" label="Created" showTime />
      <OpenInModerationButton />
    </Datagrid>
  </List>
);
