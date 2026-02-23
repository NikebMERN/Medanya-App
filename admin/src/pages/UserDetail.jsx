import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../lib/api";
import { ArrowLeft } from "lucide-react";

function DataSection({ title, data, render }) {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 mb-4">
        <h3 className="font-semibold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm">No data</p>
      </section>
    );
  }
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 mb-4">
      <h3 className="font-semibold text-slate-800 mb-2">{title}</h3>
      {render ? render(data) : <pre className="text-xs overflow-auto max-h-60">{JSON.stringify(data, null, 2)}</pre>}
    </section>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "user-full", id],
    queryFn: () => adminApi.getUserFullData(id).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <p className="text-slate-500">Loading user data…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <p className="text-red-600">User not found or error loading data.</p>
      </div>
    );
  }

  const { mysql, mongo, risk } = data;
  const user = mysql?.user || {};

  return (
    <div className="max-w-4xl">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="h-5 w-5" />
        Back
      </button>

      <div className="rounded-lg border border-slate-200 bg-white p-4 mb-4 overflow-hidden">
        <div className="flex items-start gap-4">
          {user.avatar_url && (
            <img
              src={user.avatar_url}
              alt=""
              className="w-20 h-20 rounded-full object-cover border border-slate-200"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 truncate">{user.display_name || "—"}</h1>
            <p className="text-slate-600 text-sm">ID: {user.id}</p>
            <p className="text-slate-600 text-sm">{user.phone_number || "—"}</p>
            <p className="text-slate-600 text-sm">{user.email || "—"}</p>
            <p className="text-slate-600 text-sm">Role: {user.role} | Banned: {user.is_banned ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      <DataSection
        title="MySQL — users"
        data={user}
        render={(u) => (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(u).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="font-mono text-slate-500">{k}:</span>
                <span className="truncate">{v != null ? String(v) : "—"}</span>
              </div>
            ))}
          </div>
        )}
      />

      <DataSection title="Risk" data={risk} render={(r) => <pre className="text-xs">{JSON.stringify(r, null, 2)}</pre>} />

      <DataSection
        title="MySQL — jobs (created_by)"
        data={mysql?.jobs}
        render={(arr) => (
          <div className="space-y-2 max-h-60 overflow-auto">
            {arr.map((j) => (
              <div key={j.id} className="text-sm border-b border-slate-100 pb-2">
                #{j.id} {j.title} — {j.status}
              </div>
            ))}
          </div>
        )}
      />

      <DataSection
        title="MySQL — marketplace_items (seller)"
        data={mysql?.marketplaceItems}
        render={(arr) => (
          <div className="space-y-2 max-h-60 overflow-auto">
            {arr.map((i) => (
              <div key={i.id} className="text-sm border-b border-slate-100 pb-2">
                #{i.id} {i.title} — {i.status}
              </div>
            ))}
          </div>
        )}
      />

      <DataSection
        title="MySQL — job_applications"
        data={mysql?.jobApplications}
        render={(arr) => (
          <div className="space-y-2 max-h-60 overflow-auto">
            {arr.map((a) => (
              <div key={a.id} className="text-sm">
                Job #{a.job_id} ({a.job_title || "—"}) — {a.status}
              </div>
            ))}
          </div>
        )}
      />

      <DataSection
        title="MySQL — follows (follower)"
        data={mysql?.followsAsFollower}
        render={(arr) => (
          <div className="text-sm">Following {arr.length} users</div>
        )}
      />

      <DataSection
        title="MySQL — follows (following)"
        data={mysql?.followsAsFollowing}
        render={(arr) => (
          <div className="text-sm">{arr.length} followers</div>
        )}
      />

      <DataSection
        title="MySQL — device tokens"
        data={mysql?.deviceTokens}
        render={(arr) => <pre className="text-xs">{JSON.stringify(arr, null, 2)}</pre>}
      />

      <DataSection
        title="MySQL — kyc_submissions"
        data={mysql?.kycSubmissions}
        render={(arr) => <pre className="text-xs">{JSON.stringify(arr, null, 2)}</pre>}
      />

      <DataSection
        title="MySQL — follow_requests (as requester)"
        data={mysql?.followRequestsAsRequester}
        render={(arr) => <pre className="text-xs">{JSON.stringify(arr, null, 2)}</pre>}
      />

      <DataSection
        title="MySQL — follow_requests (as target)"
        data={mysql?.followRequestsAsTarget}
        render={(arr) => <pre className="text-xs">{JSON.stringify(arr, null, 2)}</pre>}
      />

      <DataSection
        title="MySQL — user_blocks (blocker)"
        data={mysql?.blocksByUser}
        render={(arr) => <pre className="text-xs">{JSON.stringify(arr, null, 2)}</pre>}
      />

      <DataSection
        title="MySQL — user_blocks (blocked)"
        data={mysql?.blockedByOthers}
        render={(arr) => <pre className="text-xs">{JSON.stringify(arr, null, 2)}</pre>}
      />

      <DataSection
        title="MongoDB — reports against user"
        data={mongo?.reportsAgainst}
        render={(arr) => (
          <div className="space-y-1 max-h-60 overflow-auto text-sm">
            {arr.map((r, i) => (
              <div key={i}>{r.reason} by {r.reporterId} at {r.createdAt ? new Date(r.createdAt).toISOString() : "—"}</div>
            ))}
          </div>
        )}
      />

      <DataSection
        title="MongoDB — reports by user"
        data={mongo?.reportsBy}
        render={(arr) => (
          <div className="space-y-1 max-h-60 overflow-auto text-sm">
            {arr.map((r, i) => (
              <div key={i}>{r.targetType} #{r.targetId} — {r.reason}</div>
            ))}
          </div>
        )}
      />

      <DataSection
        title="MongoDB — activities (last 7 days)"
        data={mongo?.activities}
        render={(arr) => (
          <div className="space-y-1 max-h-60 overflow-auto text-sm">
            {arr.map((a, i) => (
              <div key={i}>{a.action} {a.targetType} {a.targetId} — {a.createdAt ? new Date(a.createdAt).toISOString() : ""}</div>
            ))}
          </div>
        )}
      />

      <DataSection
        title="MongoDB — chats (participant)"
        data={mongo?.chats}
        render={(arr) => <div className="text-sm">{arr.length} chats</div>}
      />

      <DataSection
        title="MongoDB — videos"
        data={mongo?.videos}
        render={(arr) => (
          <div className="space-y-1 max-h-60 overflow-auto text-sm">
            {arr.map((v) => (
              <div key={v._id}>{v.caption || "—"} — {v.status}</div>
            ))}
          </div>
        )}
      />

      <DataSection
        title="MongoDB — streams"
        data={mongo?.streams}
        render={(arr) => (
          <div className="space-y-1 max-h-60 overflow-auto text-sm">
            {arr.map((s) => (
              <div key={s._id}>{s.title || "—"} — {s.status}</div>
            ))}
          </div>
        )}
      />
    </div>
  );
}
