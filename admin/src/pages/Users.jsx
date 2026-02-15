import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../lib/api";
import { DataTable } from "../components/DataTable";

export default function Users() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, query],
    queryFn: () => adminApi.users({ page, limit: 20, query }).then((r) => r.data),
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const columns = [
    { key: "id", label: "ID" },
    { key: "display_name", label: "Name" },
    {
      key: "phone_number",
      label: "Phone",
      render: (v) => (v ? `${String(v).slice(0, 4)}****${String(v).slice(-2)}` : "—"),
    },
    { key: "role", label: "Role" },
    {
      key: "is_banned",
      label: "Banned",
      render: (v) => (v ? "Yes" : "No"),
    },
    { key: "created_at", label: "Created", render: (v) => (v ? new Date(v).toLocaleDateString() : "—") },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Users</h1>
      <div className="mb-4 flex gap-4">
        <input
          type="search"
          placeholder="Search by phone or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-64"
        />
      </div>
      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading…
        </div>
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
