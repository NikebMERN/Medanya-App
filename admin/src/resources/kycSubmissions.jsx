import {
  List,
  Datagrid,
  TextField,
  DateField,
  SelectInput,
  Show,
  SimpleShowLayout,
  Button,
  useUpdate,
  useNotify,
  useRecordContext,
} from "react-admin";
import { Card, CardContent, Typography, Box } from "@mui/material";

const kycFilters = [
  <SelectInput key="status" source="status" choices={[
    { id: "pending_manual", name: "Pending Manual" },
    { id: "pending", name: "Pending" },
  ]} alwaysOn />,
];

function ApproveButton() {
  const record = useRecordContext();
  const [update] = useUpdate();
  const notify = useNotify();
  if (!record || record.status !== "pending_manual" && record.status !== "pending") return null;
  return (
    <Button
      label="Approve"
      onClick={() =>
        update("kycSubmissions", {
          id: record.id,
          data: { approve: true },
          previousData: record,
        }, {
          onSuccess: () => notify("Approved", { type: "success" }),
          onError: (e) => notify(e?.message || "Failed", { type: "error" }),
        })
      }
    />
  );
}

function RejectButton() {
  const record = useRecordContext();
  const [update] = useUpdate();
  const notify = useNotify();
  if (!record || record.status !== "pending_manual" && record.status !== "pending") return null;
  return (
    <Button
      label="Reject"
      color="error"
      onClick={() =>
        update("kycSubmissions", {
          id: record.id,
          data: { reject: true, reason: "Rejected by admin" },
          previousData: record,
        }, {
          onSuccess: () => notify("Rejected", { type: "success" }),
          onError: (e) => notify(e?.message || "Failed", { type: "error" }),
        })
      }
    />
  );
}

export const KycList = () => (
  <List filters={kycFilters} filterDefaultValues={{ status: "pending_manual" }} perPage={25}>
    <Datagrid rowClick="show">
      <TextField source="id" label="ID" />
      <TextField source="user_id" label="User ID" />
      <TextField source="doc_type" label="Doc Type" />
      <TextField source="status" label="Status" />
      <DateField source="created_at" label="Submitted" showTime />
      <TextField source="face_match_score" label="Face Score" />
    </Datagrid>
  </List>
);

export const KycShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="user_id" label="User ID" />
      <TextField source="doc_type" label="Doc Type" />
      <TextField source="status" />
      <TextField source="extracted_name" label="Extracted Name" />
      <TextField source="extracted_dob" label="Extracted DOB" />
      <TextField source="face_match_score" label="Face Match Score" />
      <TextField source="name_match_score" label="Name Match Score" />
      <Card>
        <CardContent>
          <Typography variant="subtitle2">Actions</Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <ApproveButton />
            <RejectButton />
          </Box>
        </CardContent>
      </Card>
    </SimpleShowLayout>
  </Show>
);
