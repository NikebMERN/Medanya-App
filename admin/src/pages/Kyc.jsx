import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../lib/api";
import { DataTable } from "../components/DataTable";

export default function Kyc() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [otpModal, setOtpModal] = useState({ open: false, userId: null, otp: "", loading: false, error: null });
  const [dataModal, setDataModal] = useState({ open: false, userId: null, data: null, loading: false });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "kyc", "users", page, query],
    queryFn: () => adminApi.kycUsers({ page, limit: 50, query }).then((r) => r.data),
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  const handleRequestOtp = async (userId) => {
    setOtpModal((m) => ({ ...m, userId, loading: true, error: null }));
    try {
      await adminApi.kycRequestOtp(userId);
      setOtpModal((m) => ({ ...m, loading: false, error: null }));
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || "Failed to send OTP";
      setOtpModal((m) => ({ ...m, loading: false, error: msg }));
    }
  };

  const handleVerifyOtp = async () => {
    const { userId, otp } = otpModal;
    if (!userId || !otp?.trim()) return;
    setOtpModal((m) => ({ ...m, loading: true, error: null }));
    try {
      await adminApi.kycVerifyOtp(userId, otp.trim());
      setOtpModal({ open: false, userId: null, otp: "", loading: false, error: null });
      openDataModal(userId);
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || "Invalid OTP";
      setOtpModal((m) => ({ ...m, loading: false, error: msg }));
    }
  };

  const openDataModal = async (userId) => {
    setDataModal({ open: true, userId, data: null, loading: true });
    try {
      const res = await adminApi.kycUserData(userId);
      setDataModal((m) => ({ ...m, data: res?.data?.data ?? res?.data, loading: false }));
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || "Failed to load data";
      setDataModal((m) => ({ ...m, data: { error: msg }, loading: false }));
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "display_name", label: "Name" },
    { key: "phone_masked", label: "Phone" },
    {
      key: "kyc_status",
      label: "Status",
      render: (v) => (
        <span className={v === "verified_auto" || v === "verified_manual" ? "text-emerald-600 font-medium" : v === "rejected" ? "text-red-600" : "text-slate-600"}>
          {v || "none"}
        </span>
      ),
    },
    {
      key: "verification_reason",
      label: "Why verified",
      render: (v) => v || "—",
    },
    {
      key: "reject_reason",
      label: "Why failed",
      render: (v) => (v ? <span className="text-red-600">{v}</span> : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <button
          type="button"
          onClick={() => {
            setOtpModal({ open: true, userId: row.id, otp: "", loading: false, error: null });
            handleRequestOtp(row.id);
          }}
          className="rounded bg-primary px-2 py-1 text-xs text-white hover:opacity-90"
        >
          View data (OTP)
        </button>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">KYC Verification Status</h1>
      <p className="text-sm text-slate-600 mb-4">
        View verification status per user. To view sensitive KYC data (documents, personal info), request OTP—valid for 20 minutes per user.
      </p>
      <div className="mb-4 flex gap-4">
        <input
          type="search"
          placeholder="Search by phone or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setPage(1)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-64"
        />
        <button
          type="button"
          onClick={() => setPage(1)}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90"
        >
          Search
        </button>
      </div>
      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">Loading…</div>
      ) : (
        <>
          <DataTable columns={columns} data={users} keyField="id" emptyMessage="No users" />
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
                disabled={page * 50 >= total}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border px-2 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {otpModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOtpModal({ open: false, userId: null, otp: "", loading: false, error: null })} aria-hidden />
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Enter OTP</h3>
            <p className="mt-2 text-sm text-slate-600">
              An OTP was sent to your registered phone. Enter it below. Valid for 20 minutes.
            </p>
            {otpModal.error && <p className="mt-2 text-sm text-red-600">{otpModal.error}</p>}
            <input
              type="text"
              placeholder="6-digit code"
              maxLength={6}
              value={otpModal.otp}
              onChange={(e) => setOtpModal((m) => ({ ...m, otp: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg tracking-widest"
            />
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setOtpModal({ open: false, userId: null, otp: "", loading: false, error: null })}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={otpModal.loading || otpModal.otp?.length !== 6}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {otpModal.loading ? "Verifying…" : "Verify"}
              </button>
            </div>
          </div>
        </div>
      )}

      {dataModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDataModal({ open: false, userId: null, data: null, loading: false })} aria-hidden />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">KYC Data (User {dataModal.userId})</h3>
            {dataModal.loading ? (
              <p className="mt-4 text-slate-500">Loading…</p>
            ) : dataModal.data?.error ? (
              <p className="mt-4 text-red-600">{dataModal.data.error}</p>
            ) : dataModal.data ? (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <strong>Status:</strong> {dataModal.data.kyc_status} {dataModal.data.kyc_face_verified && "(face verified)"}
                </div>
                {dataModal.data.verification_reason && (
                  <div>
                    <strong>Verification reason:</strong> {dataModal.data.verification_reason}
                  </div>
                )}
                {dataModal.data.submission ? (
                  <>
                    <div>
                      <strong>Doc type:</strong> {dataModal.data.submission.doc_type} | <strong>Last 4:</strong> {dataModal.data.submission.last4}
                    </div>
                    <div>
                      <strong>Full name:</strong> {dataModal.data.submission.full_name || "—"}
                    </div>
                    <div>
                      <strong>Birthdate:</strong> {dataModal.data.submission.birthdate || "—"}
                    </div>
                    <div>
                      <strong>Face score:</strong> {dataModal.data.submission.face_match_score ?? "—"} | <strong>Name score:</strong> {dataModal.data.submission.name_match_score ?? "—"}
                    </div>
                    {dataModal.data.submission.reject_reason && (
                      <div className="text-red-600">
                        <strong>Reject reason:</strong> {dataModal.data.submission.reject_reason}
                      </div>
                    )}
                    {dataModal.data.submission.doc_front_url && (
                      <div>
                        <strong>Doc front:</strong>{" "}
                        <a href={dataModal.data.submission.doc_front_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                          View
                        </a>
                      </div>
                    )}
                    {dataModal.data.submission.selfie_url && (
                      <div>
                        <strong>Selfie:</strong>{" "}
                        <a href={dataModal.data.submission.selfie_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                          View
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <p>{dataModal.data.reason || "No submission"}</p>
                )}
              </div>
            ) : null}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setDataModal({ open: false, userId: null, data: null, loading: false })}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
