import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../lib/api";
import { DataTable } from "../components/DataTable";
import { ConfirmModal } from "../components/ConfirmModal";

export default function Kyc() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [modal, setModal] = useState({ open: false, type: null, submission: null });
  const [approveFaceVerified, setApproveFaceVerified] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "kyc", status],
    queryFn: () => adminApi.kycList({ status, page: 1, limit: 50 }).then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, faceVerified }) =>
      adminApi.kycApprove(id, { faceVerified: !!faceVerified }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "kyc"] });
      setModal({ open: false, type: null, submission: null });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => adminApi.kycReject(id, { reason: reason || "Rejected" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "kyc"] });
      setModal({ open: false, type: null, submission: null });
    },
  });

  const submissions = data?.submissions ?? [];
  const total = data?.total ?? 0;

  const columns = [
    { key: "id", label: "ID" },
    { key: "user_id", label: "User ID" },
    { key: "display_name", label: "Name" },
    { key: "doc_type", label: "Doc type" },
    { key: "last4", label: "Last 4" },
    {
      key: "created_at",
      label: "Submitted",
      render: (v) => (v ? new Date(v).toLocaleDateString() : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModal({ open: true, type: "approve", submission: row })}
            className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setModal({ open: true, type: "reject", submission: row })}
            className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
          >
            Reject
          </button>
        </div>
      ),
    },
  ];

  const handleApprove = () => {
    if (!modal.submission) return;
    approveMutation.mutate({ id: modal.submission.id, faceVerified: approveFaceVerified });
  };

  const handleReject = (reason) => {
    if (!modal.submission) return;
    rejectMutation.mutate({ id: modal.submission.id, reason });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">KYC Moderation</h1>
      <div className="flex gap-2 mb-4">
        {["pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              status === s ? "bg-primary text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={submissions}
          keyField="id"
          emptyMessage={`No ${status} submissions`}
        />
      )}

      {modal.open && modal.type === "approve" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal({ open: false, type: null, submission: null })} aria-hidden />
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Approve KYC</h3>
            <p className="mt-2 text-sm text-slate-600">Set user as verified. Only check &quot;Face matched&quot; if you confirmed the selfie matches the document (required for job/trade posting).</p>
            <label className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={approveFaceVerified}
                onChange={(e) => setApproveFaceVerified(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-sm">Face matched (allow jobs &amp; marketplace)</span>
            </label>
            <div className="mt-6 flex gap-3 justify-end">
              <button type="button" onClick={() => setModal({ open: false, type: null, submission: null })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={() => { handleApprove(); setModal({ open: false, type: null, submission: null }); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">Approve</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={modal.open && modal.type === "reject"}
        onClose={() => setModal({ open: false, type: null, submission: null })}
        title="Reject KYC"
        description="Reject this submission. Optionally add a reason in the next step."
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={() => handleReject("Rejected by admin")}
      />
    </div>
  );
}
