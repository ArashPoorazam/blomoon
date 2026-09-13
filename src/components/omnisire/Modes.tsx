"use client";
import { useState } from "react";
import type { modesOverview } from "@/lib/admin/queries";
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
import { useUnsaved } from "./useUnsaved";
type Mode = Json<Awaited<ReturnType<typeof modesOverview>>>[number];
export function Modes() {
  const { data, error, refresh } = useResource<Mode[]>("modes");
  return (
    <>
      <PageTitle
        title="Modes & providers"
        description="One platform. Independent media capabilities."
      />
      <Feedback error={error} />
      {data ? (
        data.map((m) => (
          <ModeCard
            key={`${m.id}:${m.settings.version}`}
            mode={m}
            refresh={refresh}
          />
        ))
      ) : (
        <Loading />
      )}
    </>
  );
}
function ModeCard({ mode: m, refresh }: { mode: Mode; refresh: () => void }) {
  const [settings, setSettings] = useState(m.settings);
  const action = useAction(refresh);
  useUnsaved(JSON.stringify(settings) !== JSON.stringify(m.settings));
  const stale =
    !m.metrics.worker ||
    Date.now() - Date.parse(m.metrics.worker.heartbeat) > 120000;
  return (
    <div className="om-panel">
      <div className="om-page-title">
        <div>
          <h2>{m.label}</h2>
          <p>
            <a href={m.provider.url} target="_blank" rel="noreferrer">
              {m.provider.name} ↗
            </a>{" "}
            · {m.provider.attribution}
          </p>
        </div>
        <Badge value={m.settings.enabled ? "enabled" : "disabled"} />
      </div>
      <Feedback {...action} />
      <div className="om-grid">
        <div className="om-card">
          <small>Verified streams</small>
          <strong>{m.metrics.verified.toLocaleString()}</strong>
        </div>
        <div className="om-card">
          <small>Checks due</small>
          <strong>{m.metrics.due.toLocaleString()}</strong>
        </div>
        <div className="om-card">
          <small>Worker</small>
          <strong>
            <Badge value={stale ? "stale" : m.metrics.worker!.status} />
          </strong>
          <span>{date(m.metrics.worker?.heartbeat)}</span>
        </div>
        <div className="om-card">
          <small>Catalog published</small>
          <p>{date(m.metrics.catalogUpdatedAt)}</p>
        </div>
      </div>
      <form
        className="om-form"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(() => request(`modes/${m.id}`, "PATCH", settings));
        }}
      >
        <label className="om-check">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) =>
              setSettings({ ...settings, enabled: e.target.checked })
            }
          />{" "}
          Enable {m.label} in Blomoon
        </label>
        {m.policyOptions && (
          <label>
            Verification policy
            <select
              value={settings.policy ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  policy: e.target.value as "observe" | "enforce",
                })
              }
            >
              <option value="" disabled>
                Deployment default
              </option>
              {m.policyOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="om-form-actions">
          <button className="om-primary" disabled={action.busy}>
            Save mode settings
          </button>
          {m.capabilities.sync && (
            <button
              type="button"
              disabled={action.busy}
              onClick={() =>
                void action.run(
                  () => request(`modes/${m.id}/sync`, "POST"),
                  "Catalog refresh queued. Follow it on the Jobs page.",
                )
              }
            >
              Refresh provider catalog
            </button>
          )}
        </div>
      </form>
      <div className="om-columns">
        <details>
          <summary>Verified coverage by country</summary>
          <ul className="om-list">
            {m.metrics.coverage.map((c) => (
              <li key={c.country}>
                {c.country}
                <span>{c.count}</span>
              </li>
            ))}
          </ul>
        </details>
        <details>
          <summary>Stream check outcomes</summary>
          <ul className="om-list">
            {m.metrics.outcomes.map((o) => (
              <li key={o.reason}>
                {o.reason.replaceAll("_", " ")}
                <span>{o.count}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
