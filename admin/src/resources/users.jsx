import { List, Datagrid, TextField, DateField, SearchInput, Show, SimpleShowLayout } from "react-admin";

const userFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Phone, name, userId" />,
];

export const UserList = () => (
  <List filters={userFilters} perPage={25}>
    <Datagrid rowClick="show">
      <TextField source="id" label="ID" />
      <TextField source="display_name" label="Name" />
      <TextField source="phone_number" label="Phone" />
      <TextField source="otp_verified" label="OTP" />
      <TextField source="kyc_status" label="KYC" />
      <TextField source="is_banned" label="Banned" />
    </Datagrid>
  </List>
);

export const UserShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="display_name" label="Name" />
      <TextField source="phone_number" label="Phone" />
      <TextField source="otp_verified" label="OTP Verified" />
      <TextField source="kyc_status" label="KYC Status" />
      <TextField source="is_banned" label="Banned" />
    </SimpleShowLayout>
  </Show>
);
