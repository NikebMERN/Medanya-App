import { List, Datagrid, TextField, DateField, Create, SimpleForm, TextInput, SelectInput, DeleteButton } from "react-admin";

export const BanList = () => (
  <List perPage={25}>
    <Datagrid>
      <TextField source="id" label="ID" />
      <TextField source="type" label="Type" />
      <TextField source="value_hash" label="Value (hash)" />
      <TextField source="reason" label="Reason" />
      <TextField source="created_by" label="Created by" />
      <DateField source="created_at" label="Created" showTime />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const BanCreate = () => (
  <Create>
    <SimpleForm>
      <SelectInput source="type" choices={[
        { id: "USER", name: "User (by ID)" },
        { id: "PHONE", name: "Phone number" },
        { id: "DEVICE", name: "Device" },
        { id: "DOC_HASH", name: "Doc Hash" },
      ]} />
      <TextInput
        source="value"
        label="Value"
        helperText="User ID (e.g. 42), phone number (e.g. +961...), device ID, or doc hash. For USER this also sets is_banned on the user."
      />
      <TextInput source="reason" label="Reason" />
    </SimpleForm>
  </Create>
);
