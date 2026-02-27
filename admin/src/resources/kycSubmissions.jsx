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
import { Card, CardContent, Typography, Box, Grid } from "@mui/material";

const kycFilterChoices = [
  { id: "all", name: "All" },
  { id: "pending_manual", name: "Pending Manual" },
  { id: "pending", name: "Pending" },
  { id: "submitted", name: "Submitted" },
  { id: "verified", name: "Verified" },
  { id: "verified_auto", name: "Verified Auto" },
  { id: "verified_manual", name: "Verified Manual" },
  { id: "rejected", name: "Rejected" },
];

const kycFilters = [
  <SelectInput key="status" source="status" choices={kycFilterChoices} alwaysOn />,
];

function ApproveButton() {
  const record = useRecordContext();
  const [update] = useUpdate();
  const notify = useNotify();
  if (!record || (record.status !== "pending_manual" && record.status !== "pending")) return null;
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
  if (!record || (record.status !== "pending_manual" && record.status !== "pending")) return null;
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

function DocImage({ src, label }) {
  if (!src) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>{label}</Typography>
      <a href={src} target="_blank" rel="noopener noreferrer">
        <Box
          component="img"
          src={src}
          alt={label}
          sx={{ maxWidth: 280, maxHeight: 200, objectFit: "contain", border: 1, borderRadius: 1 }}
        />
      </a>
      <Typography variant="caption" component="a" href={src} target="_blank" rel="noopener noreferrer" sx={{ display: "block", mt: 0.5 }}>
        Open full
      </Typography>
    </Box>
  );
}

function KYCImages() {
  const record = useRecordContext();
  if (!record) return null;
  const docFront = record.doc_front_url || (record.cloudinary_url_private && record.cloudinary_url_private.split("|")[0]);
  const docBack = record.doc_back_url || (record.cloudinary_url_private && record.cloudinary_url_private.split("|")[1]);
  const selfie = record.selfie_url || record.selfie_image_url;
  return (
    <Grid container spacing={2} sx={{ mt: 2 }}>
      <Grid item xs={12} md={4}><DocImage src={docFront} label="Doc Front" /></Grid>
      <Grid item xs={12} md={4}><DocImage src={docBack} label="Doc Back" /></Grid>
      <Grid item xs={12} md={4}><DocImage src={selfie} label="Selfie" /></Grid>
    </Grid>
  );
}

export const KycList = () => (
  <List filters={kycFilters} filterDefaultValues={{ status: "all" }} perPage={25}>
    <Datagrid rowClick="show">
      <TextField source="id" label="ID" />
      <TextField source="user_id" label="User ID" />
      <TextField source="doc_type" label="Doc Type" />
      <TextField source="status" label="Status" />
      <TextField source="display_name" label="User" />
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
      <TextField source="full_name" label="Full Name" />
      <TextField source="extracted_name" label="Extracted Name" />
      <TextField source="birthdate" label="Birthdate" />
      <TextField source="extracted_dob" label="Extracted DOB" />
      <TextField source="face_match_score" label="Face Match Score" />
      <TextField source="name_match_score" label="Name Match Score" />
      <TextField source="reject_reason" label="Reject Reason" />
      <KYCImages />
      <Card sx={{ mt: 2 }}>
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
