import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../lib/api";
import { DataTable } from "../components/DataTable";

export default function Moderation() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reviews", "listings"],
    queryFn: () => adminApi.reviewsListings().then((r) => r.data),
  });

  const listings = data?.listings ?? [];
  const columns = [
    { key: "type", label: "Type" },
    { key: "id", label: "ID" },
    { key: "title", label: "Title" },
    { key: "reports_count", label: "Reports" },
    {
      key: "status",
      label: "Status",
      render: (v) => <span className="capitalize">{v || "—"}</span>,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Moderation queue</h1>
      <p className="text-slate-600 text-sm mb-4">
        Flagged jobs and marketplace listings. Use KYC for identity verification.
      </p>
      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={listings}
          keyField="id"
          emptyMessage="No flagged listings"
        />
      )}
    </div>
  );
}
