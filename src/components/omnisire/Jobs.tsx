"use client";
import type { listJobs } from "@/lib/admin/jobs";
import { PageTitle } from "./OmnisireShell";
import {
  Badge,
  date,
  Feedback,
  Json,
  Loading,
  request,
  useAction,
  useResource,
} from "./client";
export function Jobs() {
  const { data, error, refresh } = useResource<
    Json<Awaited<ReturnType<typeof listJobs>>>
  >("jobs", 15000);
  const action = useAction(refresh);
  return (
    <>
      <PageTitle
        title="Jobs"
        description="Scheduled work and administrator-requested operations."
      >
        <button onClick={refresh}>Refresh jobs</button>
      </PageTitle>
      <Feedback error={error || action.error} notice={action.notice} />
      <div className="om-panel">
        <h2>Latest 100 operations</h2>
        {!data ? (
          <Loading />
        ) : (
          <div className="om-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Mode</th>
                  <th>State</th>
                  <th>Attempts</th>
                  <th>Requested</th>
                  <th>Result</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((j) => (
                  <tr key={j.id}>
                    <td>
                      {j.kind}
                      <small>
                        {j.actorId ? "Administrator request" : "Scheduled"}
                      </small>
                      {j.targetId && <small>{j.targetId}</small>}
                    </td>
                    <td>{j.modeId}</td>
                    <td>
                      <Badge value={j.status} />
                    </td>
                    <td>{j.attempts} / 3</td>
                    <td>{date(j.createdAt)}</td>
                    <td>{j.result ?? "Awaiting worker"}</td>
                    <td>
                      {j.status === "failed" && (
                        <button
                          disabled={action.busy}
                          onClick={() =>
                            void action.run(
                              () => request(`jobs/${j.id}/retry`, "POST"),
                              "Retry queued.",
                            )
                          }
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.length && (
              <p className="om-empty">
                No jobs yet. Request a catalog refresh from Modes & providers.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
