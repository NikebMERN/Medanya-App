import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../lib/api";
import { DataTable } from "../components/DataTable";
import UserContentPreview, { isUserContent } from "../components/UserContentPreview";
import { Shield } from "lucide-react";

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

function ContentPreview({ content }) {
  if (!content || typeof content !== "object") return null;
  if (isUserContent(content)) {
    return (
      <div className="mb-4">
        <UserContentPreview user={content} />
      </div>
    );
  }
  const rows = [];
  const add = (label, val) => {
    if (val != null && val !== "" && (typeof val !== "object" || Array.isArray(val))) {
      rows.push({ label, value: Array.isArray(val) ? val.join(", ") : String(val) });
    }
  };
  add("Title", content.title);
  add("Display Name", content.displayName ?? content.display_name);
  add("Full Name", content.fullName ?? content.full_name);
  add("Caption", content.caption);
  add("Description", content.description);
  add("Bio", content.bio);
  add("Neighborhood", content.neighborhood);
  add("Phone", content.phone ?? content.phone_number);
  add("Status", content.status);
  add("Type", content.type);
  add("Category", content.category);
  if (rows.length === 0) {
    const skip = new Set(["avatarUrl", "avatar_url", "avatar", "mediaUrls", "photos", "videos", "evidence"]);
    Object.entries(content).forEach(([k, v]) => {
      if (skip.has(k) || v == null || v === "" || typeof v === "object") return;
      rows.push({ label: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()), value: String(v) });
    });
  }
  if (rows.length === 0) return null;
  return (
    <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex gap-2">
          <span className="text-slate-500 font-medium min-w-[100px]">{r.label}:</span>
          <span className="text-slate-800 break-words">{r.value}</span>
        </div>
      ))}
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
          <div className="mb-4">
            {item.targetType === "USER" && (item.content.avatarUrl ?? item.content.avatar_url) && (
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={item.content.avatarUrl ?? item.content.avatar_url}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border border-slate-200"
                />
                <span className="font-semibold text-slate-900">
                  {item.content.displayName ?? item.content.display_name ?? item.content.fullName ?? item.content.full_name ?? item.content.title ?? "—"}
                </span>
              </div>
            )}
            <ContentPreview content={item.content} />
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
