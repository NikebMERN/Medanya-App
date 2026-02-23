import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../lib/api";
import { DataTable } from "../components/DataTable";
import { AlertTriangle } from "lucide-react";

export default function ReportedUsers() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reported-users", page],
    queryFn: () =>
      adminApi.reportedUsers({ page, limit: 20 }).then((r) => r.data),
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, banned }) =>
      adminApi.banUser(userId, banned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reported-users"] });
    },
  });

  const users = data?.reportedUsers ?? [];
  const total = data?.total ?? 0;

  const columns = [
    { key: "id", label: "ID" },
    {
      key: "display_name",
      label: "Name",
      render: (v) => v || "—",
    },
    {
      key: "phone_number",
      label: "Phone",
      render: (v) =>
        v ? `${String(v).slice(0, 4)}****${String(v).slice(-2)}` : "—",
    },
    { key: "role", label: "Role" },
    {
      key: "reportCount",
      label: "Reports",
      render: (v) => (
        <span className="font-semibold text-amber-600">{v ?? 0}</span>
      ),
    },
    {
      key: "latestReason",
      label: "Latest reason",
      render: (v) => (v ? String(v).replace(/_/g, " ") : "—"),
    },
    {
      key: "latestReportAt",
      label: "Last reported",
      render: (v) => (v ? new Date(v).toLocaleDateString() : "—"),
    },
    {
      key: "risk_label",
      label: "Risk",
      render: (v, row) => {
        const label = v || "risky";
        const color =
          label === "safe"
            ? "text-emerald-600"
            : label === "half-safe"
              ? "text-amber-600"
              : "text-red-600";
        return (
          <span className={color}>
            {label} ({row?.risk_score ?? 0}/5)
          </span>
        );
      },
    },
    {
      key: "is_banned",
      label: "Banned",
      render: (v) => (v ? "Yes" : "No"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => {
        const banned = row?.is_banned;
        return (
          <button
            type="button"
            onClick={() =>
              banMutation.mutate({
                userId: row.id,
                banned: !banned,
              })
            }
            disabled={banMutation.isPending}
            className={`rounded px-2 py-1 text-xs font-medium ${
              banned
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
          >
            {banned ? "Unban" : "Ban"}
          </button>
        );
      },
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <AlertTriangle className="h-7 w-7 text-amber-500" />
        Reported Users
      </h1>
      <p className="text-slate-600 mb-4">
        Users who have been reported by other members. Review and take action.
      </p>
      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading…
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={users}
            keyField="id"
            emptyMessage="No reported users"
          />
          {total > 0 && (
            <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
              <span>Total: {total}</span>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border px-2 py-1 disabled:opacity-50"
              >
                Previous
              </button>
              <span>Page {page}</span>
              <button
                type="button"
                disabled={page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border px-2 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
