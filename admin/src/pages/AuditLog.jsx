export default function AuditLog() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Audit logs</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-slate-600 text-sm">
          Admin action audit logs (who/what/when) will appear here when the backend
          GET /admin/audit endpoint is implemented.
        </p>
      </div>
    </div>
  );
}
