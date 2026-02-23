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
        { id: "USER", name: "User" },
        { id: "PHONE", name: "Phone" },
        { id: "DEVICE", name: "Device" },
        { id: "DOC_HASH", name: "Doc Hash" },
      ]} />
      <TextInput source="value_hash" label="Value hash" />
      <TextInput source="reason" label="Reason" />
    </SimpleForm>
  </Create>
);
