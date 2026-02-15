import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../lib/api";
import { Users, FileCheck, Shield, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { data: health } = useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => adminApi.health().then((r) => r.data),
  });
  const { data: usersData } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminApi.users({ page: 1, limit: 1 }).then((r) => r.data),
  });
  const { data: kycData } = useQuery({
    queryKey: ["admin", "kyc"],
    queryFn: () => adminApi.kycList({ status: "pending" }).then((r) => r.data),
  });

  const cards = [
    {
      label: "Total users",
      value: usersData?.total ?? "—",
      icon: Users,
      color: "bg-blue-500",
    },
    {
      label: "Pending KYC",
      value: kycData?.total ?? "—",
      icon: FileCheck,
      color: "bg-amber-500",
    },
    {
      label: "KYC queue",
      value: kycData?.submissions?.length ?? 0,
      icon: Shield,
      color: "bg-emerald-500",
    },
    {
      label: "Server",
      value: health?.ok ? "OK" : "—",
      icon: AlertCircle,
      color: "bg-slate-500",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{c.label}</span>
              <div className={`rounded-lg p-2 ${c.color}`}>
                <c.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Quick actions</h2>
        <p className="text-slate-600 text-sm">
          Use the sidebar to open Moderation (KYC), Users, and Settings.
        </p>
      </div>
    </div>
  );
}
