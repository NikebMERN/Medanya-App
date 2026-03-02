import { List, Datagrid, TextField, SearchInput } from "react-admin";
import UserShow from "../pages/UserShow";

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

export { UserShow };
