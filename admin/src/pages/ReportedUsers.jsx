import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../lib/api";
import { DataTable } from "../components/DataTable";
import { AlertTriangle } from "lucide-react";

export default function ReportedUsers() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [contextRow, setContextRow] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reported-users", page],
    queryFn: () =>
      adminApi.reportedUsers({ page, limit: 20 }).then((r) => r.data),
  });

  const { data: contextData, isLoading: contextLoading } = useQuery({
    queryKey: ["admin", "report-context", contextRow?.id, contextRow?.reporterIds?.[0]],
    queryFn: () =>
      adminApi.reportContext(contextRow?.id, contextRow?.reporterIds?.[0]).then((r) => r.data),
    enabled: !!contextRow,
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, banned }) =>
      adminApi.banUser(userId, banned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reported-users"] });
    },
  });

  const safeMutation = useMutation({
    mutationFn: (userId) => adminApi.markUserSafe(userId),
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
      key: "latestContextSourceUrl",
      label: "Video/Live link",
      render: (v) =>
        v ? (
          <a href={v} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline truncate block max-w-[180px]">
            {String(v).slice(0, 40)}…
          </a>
        ) : (
          "—"
        ),
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
        const isExpanded = contextRow?.id === row.id;
        return (
          <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setContextRow(isExpanded ? null : row)}
              className="rounded px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              {isExpanded ? "Hide" : "Context"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Mark this user as safe? This will remove all reports against them.")) {
                  safeMutation.mutate(row.id);
                }
              }}
              disabled={safeMutation.isPending}
              className="rounded px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            >
              Safe
            </button>
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
          </div>
        );
      },
    },
  ];

  const activities = contextData?.activities ?? [];
  const chatMessages = contextData?.chatMessages ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <AlertTriangle className="h-7 w-7 text-amber-500" />
        Reported Users
      </h1>
      <p className="text-slate-600 mb-4">
        Users who have been reported by other members. Risk score is computed from OTP, KYC, Behavior Trust Score, Device Fingerprinting, account age (30+ days), and report count.
      </p>

      {contextRow && (
        <div className="mb-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800 mb-2">
            Report context — User {contextRow.id} (last 20 min)
          </h3>
          {contextLoading ? (
            <p className="text-slate-500 text-sm">Loading…</p>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium text-slate-700 mb-1">Activities</h4>
                {activities.length === 0 ? (
                  <p className="text-slate-500">No activity logged</p>
                ) : (
                  <ul className="list-disc list-inside space-y-0.5">
                    {activities.map((a, i) => (
                      <li key={i}>
                        {a.action} — {a.targetType} {a.targetId ? `#${a.targetId}` : ""}{" "}
                        <span className="text-slate-500">
                          {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-1">Chat (reporter ↔ reported)</h4>
                {chatMessages.length === 0 ? (
                  <p className="text-slate-500">No chat history</p>
                ) : (
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {chatMessages.map((m, i) => (
                      <li key={i} className="text-slate-600">
                        <span className="font-mono text-xs">{m.senderId}</span>: {m.text || `[${m.type}]`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
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
            onRowClick={(row) => navigate(`/users/${row.id}`)}
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
