import { List, Datagrid, TextField, DateField, SelectInput } from "react-admin";

const auditFilters = [
  <SelectInput key="actionType" source="actionType" choices={[
    { id: "hide", name: "Hide" },
    { id: "restore", name: "Restore" },
    { id: "delete", name: "Delete" },
    { id: "ban_user", name: "Ban User" },
  ]} />,
  <SelectInput key="targetType" source="targetType" choices={[
    { id: "JOB", name: "Job" },
    { id: "VIDEO", name: "Video" },
    { id: "USER", name: "User" },
    { id: "MARKET_ITEM", name: "Market" },
  ]} />,
];

export const AuditList = () => (
  <List filters={auditFilters} perPage={25}>
    <Datagrid bulkActionButtons={false}>
      <DateField source="created_at" label="Date" showTime />
      <TextField source="admin_id" label="Admin ID" />
      <TextField source="action_type" label="Action" />
      <TextField source="target_type" label="Target Type" />
      <TextField source="target_id" label="Target ID" />
      <TextField source="metadata_json" label="Metadata" />
    </Datagrid>
  </List>
);
