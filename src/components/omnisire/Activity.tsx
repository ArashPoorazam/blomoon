"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import type { activity } from "@/lib/admin/queries";
import { PageTitle } from "./OmnisireShell";
import { Badge, date, Feedback, Json, Loading, useResource } from "./client";
export function Activity() {
  const params = useSearchParams(),
    router = useRouter();
  const { data, error } = useResource<
    Json<Awaited<ReturnType<typeof activity>>>
  >(`activity?${params}`, 30000);
  const issueState = useResource<
    { id: string; message: string; href: string }[]
  >("issues", 30000);
  return (
    <>
      <PageTitle
        title="Activity & issues"
        description="Trace changes and inspect operational events."
      />
      <Feedback error={error || issueState.error} />
      <div className="om-panel">
        <h2>Current issues</h2>
        {!issueState.data ? (
          <Loading />
        ) : issueState.data.length ? (
          <ul className="om-list">
            {issueState.data.map((i) => (
              <li key={i.id}>
                {i.message}
                <Link href={i.href}>Inspect →</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>No active issues detected.</p>
        )}
      </div>
      <div className="om-panel">
        <form
          className="om-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const p = new URLSearchParams();
            for (const [key, value] of f) p.set(key, String(value));
            router.push(`/omnisire/activity?${p}`);
          }}
        >
          <label>
            Resource
            <input
              name="q"
              defaultValue={params.get("q") ?? ""}
              placeholder="radio:, user:, job:"
            />
          </label>
          <label>
            Actor ID
            <input name="actor" defaultValue={params.get("actor") ?? ""} />
          </label>
          <label>
            Type
            <select name="severity" defaultValue={params.get("severity") ?? ""}>
              <option value="">All events</option>
              <option value="audit">Audit</option>
              <option value="info">Information</option>
              <option value="error">Errors</option>
            </select>
          </label>
          <label>
            Since
            <input
              type="date"
              name="since"
              defaultValue={params.get("since") ?? ""}
            />
          </label>
          <button>Filter activity</button>
        </form>
        {!data ? (
          <Loading />
        ) : (
          <div className="om-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Resource</th>
                  <th>Actor</th>
                  <th>Type</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a.id}>
                    <td>{a.action}</td>
                    <td>{a.resource}</td>
                    <td>{a.actor_id ?? "System"}</td>
                    <td>
                      <Badge value={a.severity} />
                    </td>
                    <td>{date(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.length && <p className="om-empty">No matching events.</p>}
            <p className="om-muted">
              Showing the latest 100 matching records. Operational events are
              retained for seven days; administrator audit records are
              preserved.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
