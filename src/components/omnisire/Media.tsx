"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { AdminModeDescriptor, CatalogPage } from "@/lib/admin/contracts";
import { PageTitle } from "./OmnisireShell";
import {
  Badge,
  Feedback,
  Loading,
  Pagination,
  request,
  useAction,
  useResource,
} from "./client";
import { ConfirmAction } from "./ConfirmAction";
export function Media() {
  const params = useSearchParams(),
    router = useRouter();
  const { data: modes, error: modeError } =
    useResource<AdminModeDescriptor[]>("modes");
  const mode = modes?.find((m) => m.id === params.get("mode")) ?? modes?.[0];
  return (
    <>
      <PageTitle
        title="Media library"
        description="Curate what the world discovers."
      >
        {mode?.capabilities.create && (
          <Link
            className="om-button om-primary"
            href={`/omnisire/media/${mode.id}/new`}
          >
            + Add {mode.itemLabel}
          </Link>
        )}
      </PageTitle>
      <Feedback error={modeError} />
      {mode ? (
        <Catalog
          key={`${mode.id}:${params}`}
          mode={mode}
          modes={modes!}
          query={params.toString()}
          navigate={(q) => router.push(`/omnisire/media?${q}`)}
        />
      ) : (
        <Loading />
      )}
    </>
  );
}
function Catalog({
  mode,
  modes,
  query,
  navigate,
}: {
  mode: AdminModeDescriptor;
  modes: AdminModeDescriptor[];
  query: string;
  navigate: (q: URLSearchParams) => void;
}) {
  const params = new URLSearchParams(query);
  params.delete("mode");
  const { data, error, refresh } = useResource<CatalogPage>(
    `modes/${mode.id}/items?${params}`,
  );
  const [ids, setIds] = useState<string[]>([]),
    [bulk, setBulk] = useState<"block" | "unblock" | "recheck" | null>(null),
    [results, setResults] = useState<
      { id: string; ok: boolean; error?: string }[]
    >([]);
  const action = useAction(refresh);
  return (
    <>
      <Feedback error={error || action.error} notice={action.notice} />
      <div className="om-panel">
        <form
          className="om-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            const p = new URLSearchParams();
            for (const [k, v] of new FormData(e.currentTarget))
              p.set(k, String(v));
            p.set("page", "1");
            navigate(p);
          }}
        >
          <label>
            Search
            <input
              name="q"
              defaultValue={params.get("q") ?? ""}
              placeholder="Name of a media item"
              maxLength={120}
            />
          </label>
          <label>
            Mode
            <select name="mode" defaultValue={mode.id}>
              {modes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Country
            <input
              name="country"
              placeholder="ISO code"
              defaultValue={params.get("country") ?? ""}
              maxLength={8}
            />
          </label>
          <label>
            Provider
            <select name="provider" defaultValue={params.get("provider") ?? ""}>
              <option value="">All sources</option>
              <option value="provider">Provider</option>
              <option value="curated">Curated</option>
            </select>
          </label>
          <label>
            Availability
            <select name="status" defaultValue={params.get("status") ?? ""}>
              <option value="">All states</option>
              {["available", "unavailable", "unverified", "disabled"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Blocked
            <select name="blocked" defaultValue={params.get("blocked") ?? ""}>
              <option value="">All</option>
              <option value="true">Blocked</option>
              <option value="false">Not blocked</option>
            </select>
          </label>
          <button>Apply filters</button>
        </form>
        {ids.length > 0 && (
          <div className="om-toolbar">
            <span>{ids.length} selected</span>
            {mode.capabilities.block && (
              <>
                <button onClick={() => setBulk("block")}>Block selected</button>
                <button onClick={() => setBulk("unblock")}>
                  Unblock selected
                </button>
              </>
            )}
            {mode.capabilities.recheck && (
              <button onClick={() => setBulk("recheck")}>
                Recheck selected
              </button>
            )}
          </div>
        )}
        {!data ? (
          <Loading />
        ) : (
          <>
            <div className="om-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Select this page"
                        checked={
                          data.items.length > 0 &&
                          ids.length === data.items.length
                        }
                        onChange={(e) =>
                          setIds(
                            e.target.checked ? data.items.map((i) => i.id) : [],
                          )
                        }
                      />
                    </th>
                    <th>Media item</th>
                    <th>Country</th>
                    <th>Source</th>
                    <th>Availability</th>
                    <th>Access</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${i.name}`}
                          checked={ids.includes(i.id)}
                          onChange={(e) =>
                            setIds(
                              e.target.checked
                                ? [...ids, i.id]
                                : ids.filter((id) => id !== i.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <Link href={`/omnisire/media/${mode.id}/${i.id}`}>
                          {i.name}
                        </Link>
                        <small>{i.id.slice(0, 8)}</small>
                      </td>
                      <td>{i.country}</td>
                      <td>{i.provider}</td>
                      <td>
                        <Badge value={i.status} />
                      </td>
                      <td>{i.blocked ? <Badge value="disabled" /> : "Open"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.items.length && (
                <p className="om-empty">No media items match these filters.</p>
              )}
            </div>
            <Pagination
              {...data}
              onPage={(page) => {
                const p = new URLSearchParams(query);
                p.set("page", String(page));
                navigate(p);
              }}
            />
          </>
        )}
      </div>
      {results.length > 0 && (
        <div className="om-panel">
          <h2>Bulk action results</h2>
          <ul className="om-list">
            {results.map((r) => (
              <li key={r.id}>
                {r.id}
                <span>{r.ok ? "Completed" : r.error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {bulk && (
        <ConfirmAction
          title={`${bulk} ${ids.length} items`}
          description="Each item is processed independently. Results and failures are shown after completion."
          busy={action.busy}
          onCancel={() => setBulk(null)}
          onConfirm={(reason) =>
            void action.run(async () => {
              const response = await request<{ results: typeof results }>(
                `modes/${mode.id}/items/bulk`,
                "POST",
                { ids, action: bulk, reason },
              );
              setResults(response.results);
              setBulk(null);
              setIds([]);
            }, "Bulk operation finished. Review individual results below.")
          }
        />
      )}
    </>
  );
}
