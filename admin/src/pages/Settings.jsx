export default function Settings() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Settings</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-slate-600 text-sm">
          Risk weights, keyword filters, and rate limits can be configured here when backend
          endpoints are available. See Backend TODO in README.
        </p>
      </div>
    </div>
  );
}
