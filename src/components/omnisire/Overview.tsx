"use client";
import Link from "next/link";
import type { overview } from "@/lib/admin/queries";
import { PageTitle } from "./OmnisireShell";
import { Badge, date, Feedback, Json, Loading, useResource } from "./client";
import { MetricChart, ServerSummary } from "./Servers";
export function Overview() {
  const { data, error, refresh } = useResource<
    Json<Awaited<ReturnType<typeof overview>>>
  >("overview", 30000);
  return (
    <>
      <PageTitle
        title="Your world, at a glance."
        description="Monitor the platform. Manage the experience."
      >
        <button onClick={refresh}>Refresh overview</button>
      </PageTitle>
      <Feedback error={error} />
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="om-grid">
            {[
              {
                label: "Accounts",
                value: data.counts.users,
                path: "users",
                note: `${data.counts.suspended} suspended`,
              },
              {
                label: "Installed modes",
                value: data.modes.length,
                path: "modes",
                note: "Shared media platform",
              },
              {
                label: "Blocked items",
                value: data.counts.blocked,
                path: "media",
                note: "Excluded from discovery",
              },
              {
                label: "Failed jobs",
                value: data.counts.failed_jobs,
                path: "jobs",
                note: "Review operation history",
              },
            ].map((k) => (
              <Link
                className="om-card"
                href={`/omnisire/${k.path}`}
                key={k.label}
              >
                <small>{k.label} ↗</small>
                <strong>{k.value.toLocaleString()}</strong>
                <span>{k.note}</span>
              </Link>
            ))}
          </div>
          <ServerSummary data={data.monitoring} />
          <div className="om-columns">
            <MetricChart
              times={data.monitoring.history.map((h) => h.received_at)}
              title="Host activity · last hour"
              values={data.monitoring.history.map((h) => h.snapshot.cpu)}
            />
            <div className="om-panel">
              <h2>Media platform</h2>
              <ul className="om-list">
                {data.modes.map((m) => (
                  <li key={m.id}>
                    <Link href="/omnisire/modes">
                      {m.label}
                      <small>{m.provider.name}</small>
                    </Link>
                    <Badge
                      value={m.settings.enabled ? "enabled" : "disabled"}
                    />
                  </li>
                ))}
              </ul>
              <p className="om-muted">
                Provider freshness, stream coverage, and worker status are
                available in Modes & providers.
              </p>
              <Link className="om-button" href="/omnisire/modes">
                Inspect providers →
              </Link>
            </div>
          </div>
          <div className="om-panel">
            <h2>Recent activity</h2>
            <div className="om-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Type</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activity.slice(0, 8).map((a) => (
                    <tr key={a.id}>
                      <td>{a.action}</td>
                      <td>{a.resource}</td>
                      <td>
                        <Badge value={a.severity} />
                      </td>
                      <td>{date(a.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.activity.length && (
                <p className="om-empty">
                  Administrator activity will appear here.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
