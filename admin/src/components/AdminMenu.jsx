import { Menu } from "react-admin";
import {
  LayoutDashboard,
  Users,
  Shield,
  ShieldAlert,
  FileCheck,
  Ban,
  FileText,
} from "lucide-react";

export function AdminMenu() {
  return (
    <Menu>
      <Menu.DashboardItem leftIcon={<LayoutDashboard size={20} />} />
      <Menu.Item to="/users" primaryText="Users" leftIcon={<Users size={20} />} />
      <Menu.Item to="/moderationQueue" primaryText="Moderation Queue" leftIcon={<ShieldAlert size={20} />} />
      <Menu.Item to="/reports" primaryText="Reports" leftIcon={<FileText size={20} />} />
      <Menu.Item to="/kycSubmissions" primaryText="KYC Review" leftIcon={<Shield size={20} />} />
      <Menu.Item to="/bans" primaryText="Bans" leftIcon={<Ban size={20} />} />
      <Menu.Item to="/auditLog" primaryText="Audit Log" leftIcon={<FileCheck size={20} />} />
    </Menu>
  );
}
