import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../lib/api";
import { DataTable } from "../components/DataTable";
import { Shield, AlertTriangle } from "lucide-react";

export default function Moderation() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("PENDING");
  const [targetType, setTargetType] = useState("");
  const [detailItem, setDetailItem] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "moderation", "queue", status, targetType],
    queryFn: () =>
      adminApi
        .moderationQueue({
          status,
          targetType: targetType || undefined,
          limit: 50,
        })
        .then((r) => r.data),
  });

  const actionMutation = useMutation({
    mutationFn: (body) => adminApi.moderationAction(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "moderation"] });
      setDetailItem(null);
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const columns = [
    {
      key: "targetType",
      label: "Type",
      render: (v) => (
        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{v || "—"}</span>
      ),
    },
    { key: "targetId", label: "ID" },
    {
      key: "content",
      label: "Preview",
      render: (_, row) => {
        const c = row.content;
        const title =
          c?.title ?? c?.caption ?? c?.fullName ?? c?.displayName ?? "—";
        return (
          <span className="text-sm truncate max-w-[200px] block" title={title}>
            {title}
          </span>
        );
      },
    },
    {
      key: "priority",
      label: "Priority",
      render: (v) => {
        const color =
          v === "URGENT"
            ? "text-red-700 bg-red-100"
            : v === "HIGH"
              ? "text-amber-700 bg-amber-100"
              : "text-slate-600 bg-slate-100";
        return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${color}`}>{v}</span>;
      },
    },
    {
      key: "reportCount24h",
      label: "Reports 24h",
      render: (v) => (
        <span className="font-semibold text-amber-600">{v ?? 0}</span>
      ),
    },
    {
      key: "reasonSummary",
      label: "Top reasons",
      render: (v) => (
        <span className="text-xs text-slate-500 max-w-[180px] truncate block" title={v || ""}>
          {v || "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (v) => (v ? new Date(v).toLocaleString() : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setDetailItem(row)}
            className="rounded px-2 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Review
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Shield className="h-7 w-7 text-primary" />
        Moderation Queue
      </h1>
      <p className="text-slate-600 mb-4">
        Auto-queued items (≥3 reports or severe). Hide, restore, delete, or ban.
      </p>

      <div className="mb-4 flex gap-4 flex-wrap">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="PENDING">Pending</option>
          <option value="ACTIONED">Actioned</option>
        </select>
        <select
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="JOB">Job</option>
          <option value="MARKET_ITEM">Market</option>
          <option value="VIDEO">Video</option>
          <option value="LIVESTREAM">Livestream</option>
          <option value="MISSING_PERSON">Missing Person</option>
          <option value="USER">User</option>
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          keyField="_id"
          emptyMessage="No items in queue"
          onRowClick={(row) => setDetailItem(row)}
        />
      )}

      {total > 0 && (
        <p className="mt-2 text-sm text-slate-500">Total: {total}</p>
      )}

      {detailItem && (
        <DetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onAction={(body) => actionMutation.mutate(body)}
          loading={actionMutation.isPending}
        />
      )}
    </div>
  );
}

function DetailModal({ item, onClose, onAction, loading }) {
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!action) return;
    onAction({
      actionType: action,
      targetType: item.targetType,
      targetId: item.targetId,
      reason: reason || undefined,
      banLevel: action === "ban_user" ? "hard" : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-auto">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Review: {item.targetType} #{item.targetId}
        </h3>
        <p className="text-sm text-slate-600 mb-2">
          Reports (24h): {item.reportCount24h} | Priority: {item.priority}
        </p>
        <p className="text-xs text-slate-500 mb-4">{item.reasonSummary}</p>

        {item.content && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm">
            <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-40">
              {JSON.stringify(item.content, null, 2)}
            </pre>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Action</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">— Select —</option>
            <option value="hide">Hide</option>
            <option value="restore">Restore</option>
            <option value="delete">Delete</option>
            {item.targetType === "USER" && (
              <option value="ban_user">Ban user</option>
            )}
          </select>

          <label className="block text-sm font-medium text-slate-700">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Violates policy"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!action || loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Applying…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
