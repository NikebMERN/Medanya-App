import { Admin, Resource } from "react-admin";
import { dataProvider } from "./dataProvider";
import { authProvider } from "./authProvider";
import { darkTheme } from "./theme";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ModerationShow from "./pages/ModerationShow";
import { ModerationQueueList } from "./resources/moderationQueue";
import { UserList, UserShow } from "./resources/users";
import { ReportList } from "./resources/reports";
import { KycList, KycShow } from "./resources/kycSubmissions";
import { BanList, BanCreate } from "./resources/bans";
import { AuditList } from "./resources/auditLog";

function App() {
  return (
    <Admin
      dataProvider={dataProvider}
      authProvider={authProvider}
      theme={darkTheme}
      loginPage={Login}
      dashboard={Dashboard}
      darkMode
    >
      <Resource
        name="moderationQueue"
        list={ModerationQueueList}
        show={ModerationShow}
        options={{ label: "Moderation Queue" }}
      />
      <Resource name="users" list={UserList} show={UserShow} options={{ label: "Users" }} />
      <Resource name="reports" list={ReportList} options={{ label: "Reports" }} />
      <Resource
        name="kycSubmissions"
        list={KycList}
        show={KycShow}
        options={{ label: "KYC Review" }}
      />
      <Resource
        name="bans"
        list={BanList}
        create={BanCreate}
        options={{ label: "Bans" }}
      />
      <Resource
        name="auditLog"
        list={AuditList}
        options={{ label: "Audit Log" }}
      />
    </Admin>
  );
}

export default App;
