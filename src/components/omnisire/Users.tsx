"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { listUsers } from "@/lib/admin/users";
import { PageTitle } from "./OmnisireShell";
import {
  Badge,
  date,
  Feedback,
  Json,
  Loading,
  Pagination,
  request,
  useAction,
  useResource,
} from "./client";
import { ConfirmAction } from "./ConfirmAction";
export function Users() {
  const params = useSearchParams(),
    router = useRouter();
  const q = params.get("q") ?? "",
    page = Number(params.get("page") ?? 1);
  const { data, error, refresh } = useResource<
    Json<Awaited<ReturnType<typeof listUsers>>>
  >(`users?q=${encodeURIComponent(q)}&page=${page}`);
  const action = useAction(refresh);
  const [target, setTarget] = useState<{
    id: string;
    email: string;
    action: "suspend" | "restore" | "revoke";
  } | null>(null);
  const navigate = (query: string, p: number) =>
    router.push(`/omnisire/users?q=${encodeURIComponent(query)}&page=${p}`);
  return (
    <>
      <PageTitle
        title="Users"
        description="Manage account access and active sessions."
      />
      <Feedback error={error || action.error} notice={action.notice} />
      <div className="om-panel">
        <form
          className="om-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(String(new FormData(e.currentTarget).get("q") ?? ""), 1);
          }}
        >
          <label>
            Search accounts
            <input
              key={q}
              name="q"
              defaultValue={q}
              placeholder="Email address"
              maxLength={120}
            />
          </label>
          <button>Search</button>
        </form>
        {!data ? (
          <Loading />
        ) : (
          <>
            <div className="om-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Last login</th>
                    <th>Sessions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => (
                    <tr key={u.id}>
                      <td>
                        {u.email}
                        <small>
                          {u.owner
                            ? "Owner"
                            : u.email_verified
                              ? "Verified"
                              : "Unverified"}
                        </small>
                      </td>
                      <td>
                        <Badge value={u.reason ? "suspended" : "active"} />
                        {u.reason && <small>{u.reason}</small>}
                      </td>
                      <td>{date(u.created_at)}</td>
                      <td>{date(u.last_login_at)}</td>
                      <td>{u.session_count}</td>
                      <td>
                        <div className="om-row-actions">
                          <button
                            disabled={action.busy || u.owner}
                            onClick={() =>
                              setTarget({
                                id: u.id,
                                email: u.email,
                                action: u.reason ? "restore" : "suspend",
                              })
                            }
                          >
                            {u.reason ? "Restore" : "Suspend"}
                          </button>
                          <button
                            disabled={action.busy}
                            onClick={() =>
                              setTarget({
                                id: u.id,
                                email: u.email,
                                action: "revoke",
                              })
                            }
                          >
                            Revoke sessions
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.items.length && (
                <p className="om-empty">No accounts match this search.</p>
              )}
            </div>
            <Pagination {...data} onPage={(p) => navigate(q, p)} />
          </>
        )}
      </div>
      {target && (
        <ConfirmAction
          title={`${target.action} account`}
          description={`${target.email}. This action is recorded in the administrator audit history.`}
          busy={action.busy}
          onCancel={() => setTarget(null)}
          onConfirm={(reason) =>
            void action.run(async () => {
              await request(`users/${target.id}`, "POST", {
                action: target.action,
                reason,
              });
              setTarget(null);
            })
          }
        />
      )}
    </>
  );
}
