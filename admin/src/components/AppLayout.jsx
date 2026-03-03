import { Layout } from "react-admin";
import { AdminMenu } from "./AdminMenu";
import { AdminAppBar } from "./AdminAppBar";

export function AppLayout({ children }) {
  return (
    <Layout menu={AdminMenu} appBar={AdminAppBar} appBarAlwaysOn>
      {children}
    </Layout>
  );
}
