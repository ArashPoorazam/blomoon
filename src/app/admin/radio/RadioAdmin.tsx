"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { findCountryByCode } from "@/lib/geo";
import type { listAdminStations, radioHealthMetrics } from "@/lib/modes/radio/admin";
type Station = Awaited<ReturnType<typeof listAdminStations>>[number];
type Metrics = Awaited<ReturnType<typeof radioHealthMetrics>>;
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
export function RadioAdmin() {
  const [stations, setStations] = useState<Station[]>([]),
    [metrics, setMetrics] = useState<Metrics | null>(null);
  const [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false),
    [form, setForm] = useState(empty),
    [id, setId] = useState<string | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(`/api/admin/radio/stations?q=${encodeURIComponent(query)}`, { signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setStations(data.stations);
        setMetrics(data.metrics);
        setError("");
      } catch (error) {
        if (!signal?.aborted) setError(error instanceof Error ? error.message : "Could not load stations.");
      }
    },
    [query],
  );
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => void load(controller.signal), 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load]);
  function edit(station: Station) {
    const p = station.record.point,
      m = p.metrics ?? {};
    setId(station.station_id);
    setForm({
      name: p.name,
      countryCode: p.countryCode ?? "",
      language: String(m.Language ?? ""),
      tags: String(m.Tags ?? ""),
      homepage: station.record.detail.sourceUrl ?? "",
      artwork: p.artworkUrl ?? "",
      latitude: p.locationPrecision === "station" ? String(p.latitude) : "",
      longitude: p.locationPrecision === "station" ? String(p.longitude) : "",
      streams: station.streams
        .filter((s) => s.enabled || (!station.enabled && s.origin === "curated"))
        .map((s) => s.streamUrl)
        .join("\n"),
      enabled: station.enabled,
    });
    setNotice(
      station.curated
        ? "Editing curated station."
        : "Saving creates a curated override for this station; provider streams remain attached.",
    );
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/radio/stations${id ? `/${id}` : ""}`, {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          latitude: form.latitude === "" ? null : Number(form.latitude),
          longitude: form.longitude === "" ? null : Number(form.longitude),
          streams: form.streams
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setId(data.id);
      setNotice("Station saved. New streams appear in discovery after verification.");
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save station.");
    } finally {
      setBusy(false);
    }
  }
  async function recheck(stationId: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/radio/stations/${stationId}/recheck`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNotice(`Queued ${data.queued} stream checks.`);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not queue checks.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="radio-admin">
      <header>
        <div>
          <h1>Radio administration</h1>
          <p>Curate stations and inspect recent stream checks.</p>
        </div>
        <Link href="/">Back to globe</Link>
      </header>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <section aria-label="Checker status">
        <h2>Availability checker</h2>
        <p>
          {metrics?.worker
            ? `${metrics.worker.status} · Last heartbeat ${new Date(metrics.worker.heartbeat).toLocaleString()} · ${metrics.worker.probes} checks · ${metrics.worker.successes} successes · ${metrics.worker.bytes} bytes read`
            : "No worker heartbeat yet."}
        </p>
        <p>
          Catalog updated:{" "}
          {metrics?.generation?.publishedAt
            ? new Date(metrics.generation.publishedAt).toLocaleString()
            : "Not published yet"}
        </p>
        <details>
          <summary>Coverage and check outcomes</summary>
          {metrics ? (
            <>
              <p>
                {String(metrics.queue?.verified ?? 0)} verified streams · {String(metrics.queue?.due ?? 0)}{" "}
                checks due
              </p>
              <table>
                <caption>Verified stations by country</caption>
                <thead>
                  <tr>
                    <th>Country</th>
                    <th>Stations</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.countries.map((row) => (
                    <tr key={row.country}>
                      <td>{findCountryByCode(row.country)?.name ?? row.country}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table>
                <caption>Latest check outcomes</caption>
                <thead>
                  <tr>
                    <th>Outcome</th>
                    <th>Streams</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.outcomes.map((row) => (
                    <tr key={row.reason}>
                      <td>{row.reason.replaceAll("_", " ")}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p>Loading…</p>
          )}
        </details>
        <button type="button" onClick={() => void load()}>
          Refresh status
        </button>
      </section>
      <div className="radio-admin-columns">
        <section>
          <h2>Stations</h2>
          <label>
            Search by station name
            <input value={query} onChange={(e) => setQuery(e.target.value)} maxLength={120} />
          </label>
          <p>Up to 50 matching stations. Select a provider station to attach curated streams.</p>
          {stations.length === 0 && <p>No matching stations.</p>}
          <ul>
            {stations.map((station) => (
              <li key={station.station_id}>
                <h3>{station.record.point.name}</h3>
                <p>
                  {station.curated ? "Curated" : "Radio Browser"} · {station.availability.status}
                </p>
                <p>
                  Last verified:{" "}
                  {station.availability.lastVerifiedAt
                    ? new Date(station.availability.lastVerifiedAt).toLocaleString()
                    : "Never"}
                </p>
                <button type="button" disabled={busy} onClick={() => edit(station)}>
                  Edit / attach streams
                </button>{" "}
                <button
                  type="button"
                  disabled={busy || !station.enabled}
                  onClick={() => void recheck(station.station_id)}
                >
                  Recheck
                </button>
                <details>
                  <summary>Stream health</summary>
                  <ul>
                    {station.streams.map((stream) => (
                      <li key={stream.id}>
                        <span>{stream.streamUrl}</span>
                        <p>
                          {stream.enabled ? "Enabled" : "Disabled"} · {stream.reason ?? "No failure recorded"}{" "}
                          · {stream.failures} consecutive failures
                        </p>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>{id ? "Edit station" : "Add station"}</h2>
          <button
            type="button"
            onClick={() => {
              setId(null);
              setForm(empty);
              setNotice("");
            }}
          >
            New station
          </button>
          <form onSubmit={save}>
            {(
              [
                ["name", "Station name"],
                ["countryCode", "ISO country code"],
                ["language", "Language"],
                ["tags", "Tags (comma separated)"],
                ["homepage", "Homepage URL"],
                ["artwork", "Artwork URL"],
                ["latitude", "Latitude (optional)"],
                ["longitude", "Longitude (optional)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  value={form[key]}
                  type={key === "latitude" || key === "longitude" ? "number" : "text"}
                  step={key === "latitude" || key === "longitude" ? "any" : undefined}
                  min={key === "latitude" ? -90 : key === "longitude" ? -180 : undefined}
                  max={key === "latitude" ? 90 : key === "longitude" ? 180 : undefined}
                  required={key === "name" || key === "countryCode"}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
            <label>
              Stream URLs (one per line)
              <textarea
                required
                rows={5}
                value={form.streams}
                onChange={(e) => setForm({ ...form, streams: e.target.value })}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />{" "}
              Enabled
            </label>
            <p>
              Direct audio only. Checks run from our server’s region. New stream addresses require
              verification.
            </p>
            <button disabled={busy} type="submit">
              {busy ? "Working…" : "Save station"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
