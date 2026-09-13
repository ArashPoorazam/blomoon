"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RadioStationRecord } from "../types";
import {
  Badge,
  date,
  Feedback,
  Loading,
  request,
  useAction,
  useResource,
} from "@/components/omnisire/client";
import { PageTitle } from "@/components/omnisire/OmnisireShell";
import { ConfirmAction } from "@/components/omnisire/ConfirmAction";
import { useUnsaved } from "@/components/omnisire/useUnsaved";
type Detail = {
  curatedStreamUrls: string[];
  id: string;
  record: RadioStationRecord;
  enabled: boolean;
  curated: boolean;
  block: { reason: string } | null;
  availability: { status: string; lastVerifiedAt: string | null };
  streams: {
    id: string;
    streamUrl: string;
    enabled: boolean;
    origin: string;
    reason: string | null;
    failures: number;
    lastSuccess: string | null;
  }[];
};
const empty = {
  name: "",
  countryCode: "",
  language: "",
  tags: "",
  homepage: "",
  artwork: "",
  latitude: "",
  longitude: "",
  streams: "",
  enabled: true,
};
export function StationEditor({ id }: { id: string }) {
  const { data, error, refresh } = useResource<Detail>(
    id === "new" ? null : `modes/radio/items/${id}`,
  );
  if (id === "new") return <EditorForm id={id} refresh={refresh} />;
  return (
    <>
      <Feedback error={error} />
      {data ? (
        <EditorForm
          key={JSON.stringify(data)}
          id={id}
          detail={data}
          refresh={refresh}
        />
      ) : (
        <Loading />
      )}
    </>
  );
}
function EditorForm({
  id,
  detail,
  refresh,
}: {
  id: string;
  detail?: Detail;
  refresh: () => void;
}) {
  const initial = detail
    ? {
        name: detail.record.point.name,
        countryCode: detail.record.point.countryCode ?? "",
        language: String(detail.record.point.metrics?.Language ?? ""),
        tags: String(detail.record.point.metrics?.Tags ?? ""),
        homepage: detail.record.detail.sourceUrl ?? "",
        artwork: detail.record.point.artworkUrl ?? "",
        latitude:
          detail.record.point.locationPrecision === "station"
            ? String(detail.record.point.latitude)
            : "",
        longitude:
          detail.record.point.locationPrecision === "station"
            ? String(detail.record.point.longitude)
            : "",
        streams:
          detail.curatedStreamUrls.join("\n") ||
          detail.streams
            .filter((s) => s.origin === "curated" && s.enabled)
            .map((s) => s.streamUrl)
            .join("\n") ||
          detail.streams
            .filter((s) => s.enabled)
            .map((s) => s.streamUrl)
            .slice(0, 10)
            .join("\n"),
        enabled: detail.enabled,
      }
    : empty;
  const [form, setForm] = useState(initial),
    [saved, setSaved] = useState(false),
    [confirm, setConfirm] = useState(false);
  const action = useAction();
  const router = useRouter();
  useUnsaved(!saved && JSON.stringify(form) !== JSON.stringify(initial));
  return (
    <>
      <PageTitle
        title={detail?.record.point.name ?? "Add a station"}
        description={
          detail
            ? "Inspect availability and curate metadata and stream sources."
            : "Add a direct-audio station to the Blomoon catalog."
        }
      >
        <Link className="om-button" href="/omnisire/media">
          ← Media library
        </Link>
      </PageTitle>
      <Feedback {...action} />
      {detail && (
        <div className="om-panel">
          <div className="om-toolbar">
            <Badge value={detail.availability.status} />
            <span className="om-muted">
              Last verified: {date(detail.availability.lastVerifiedAt)}
            </span>
            <button disabled={action.busy} onClick={() => setConfirm(true)}>
              {detail.block || !detail.enabled
                ? "Unblock station"
                : "Block station"}
            </button>
            <button
              disabled={action.busy || Boolean(detail.block) || !detail.enabled}
              onClick={() =>
                void action.run(
                  () => request(`modes/radio/items/${id}/recheck`, "POST"),
                  "Recheck job queued. Follow progress in Jobs.",
                )
              }
            >
              Recheck streams
            </button>
          </div>
          {detail.block && (
            <p className="om-muted">Block reason: {detail.block.reason}</p>
          )}
          {!detail.curated && (
            <p className="om-muted">
              Saving creates a curated override. Provider updates will preserve
              your edits.
            </p>
          )}
        </div>
      )}
      <form
        className="om-form"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            const result = await request<{ id: string }>(
              `modes/radio/items${id === "new" ? "" : `/${id}`}`,
              id === "new" ? "POST" : "PATCH",
              {
                ...form,
                latitude: form.latitude === "" ? null : Number(form.latitude),
                longitude:
                  form.longitude === "" ? null : Number(form.longitude),
                streams: form.streams
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              },
            );
            setSaved(true);
            router.replace(`/omnisire/media/radio/${result.id}`);
            if (id !== "new") refresh();
          }, "Station saved. New streams require successful verification.");
        }}
      >
        <div className="om-panel om-form">
          <h2>Station identity</h2>
          <div className="om-form-grid">
            {(
              [
                ["name", "Station name"],
                ["countryCode", "ISO country code"],
                ["language", "Language"],
                ["tags", "Tags · comma separated"],
                ["homepage", "Homepage URL"],
                ["artwork", "Artwork URL"],
                ["latitude", "Latitude · optional"],
                ["longitude", "Longitude · optional"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  required={key === "name" || key === "countryCode"}
                  type={
                    key === "latitude" || key === "longitude"
                      ? "number"
                      : key === "homepage" || key === "artwork"
                        ? "url"
                        : "text"
                  }
                  step="any"
                  value={form[key]}
                  onChange={(e) => {
                    setSaved(false);
                    setForm({ ...form, [key]: e.target.value });
                  }}
                />
              </label>
            ))}
          </div>
        </div>
        <div className="om-panel om-form">
          <h2>Playback sources</h2>
          <label>
            Stream URLs · one per line
            <textarea
              required
              rows={6}
              value={form.streams}
              onChange={(e) => {
                setSaved(false);
                setForm({ ...form, streams: e.target.value });
              }}
            />
          </label>
          <p className="om-muted">
            Up to 10 direct-audio URLs. Source validation and country placement
            run on the server. HLS and playlist streams are not supported.
          </p>
          <button className="om-primary" disabled={action.busy}>
            {action.busy ? "Saving…" : "Save station"}
          </button>
        </div>
      </form>
      {detail && (
        <div className="om-panel">
          <h2>Source health</h2>
          <div className="om-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Origin</th>
                  <th>State</th>
                  <th>Last success</th>
                  <th>Failures</th>
                </tr>
              </thead>
              <tbody>
                {detail.streams.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="om-url">{s.streamUrl}</span>
                      <small>{s.reason ?? "No failure recorded"}</small>
                    </td>
                    <td>{s.origin}</td>
                    <td>
                      <Badge value={s.enabled ? "enabled" : "disabled"} />
                    </td>
                    <td>{date(s.lastSuccess)}</td>
                    <td>{s.failures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {confirm && detail && (
        <ConfirmAction
          title={
            detail.block || !detail.enabled
              ? "Unblock station"
              : "Block station"
          }
          description="Blocking removes this station from discovery and prevents new playback resolution. Saved references are retained."
          busy={action.busy}
          onCancel={() => setConfirm(false)}
          onConfirm={(reason) =>
            void action.run(async () => {
              await request(`modes/radio/items/${id}/block`, "POST", {
                blocked: !detail.block && detail.enabled,
                reason,
              });
              setConfirm(false);
              refresh();
            })
          }
        />
      )}
    </>
  );
}
