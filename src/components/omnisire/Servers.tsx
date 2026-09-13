"use client";
import { useState } from "react";
import type { getMonitoring } from "@/lib/admin/monitor";
import {
  Badge,
  bytes,
  date,
  Feedback,
  Json,
  Loading,
  useResource,
} from "./client";
import { PageTitle } from "./OmnisireShell";
export type Monitoring = Json<Awaited<ReturnType<typeof getMonitoring>>>;
export function MetricChart({
  title,
  values,
  unit = "%",
  times,
  sampleIntervalMs = 15000,
}: {
  title: string;
  values: (number | null)[];
  unit?: string;
  times?: string[];
  sampleIntervalMs?: number;
}) {
  const valid = values.filter((v): v is number => v !== null);
  const max = Math.max(unit === "%" ? 100 : 1, ...valid);
  const timestamps = times?.map((t) => new Date(t).getTime());
  const first = timestamps?.[0] ?? 0;
  const span = Math.max(1, (timestamps?.at(-1) ?? values.length - 1) - first);
  const segments: string[][] = [[]];
  values.forEach((v, i) => {
    if (
      timestamps &&
      i &&
      timestamps[i] - timestamps[i - 1] > sampleIntervalMs * 2
    )
      segments.push([]);
    if (v === null) segments.push([]);
    else
      segments[segments.length - 1].push(
        `${(600 * ((timestamps?.[i] ?? i) - first)) / span},${140 - (v / max) * 125}`,
      );
  });
  return (
    <div className="om-panel">
      <h2>{title}</h2>
      {valid.length ? (
        <>
          <svg
            className="om-chart"
            viewBox="0 0 600 150"
            preserveAspectRatio="none"
            role="img"
            aria-label={`${title}: ${valid.length} readings; minimum ${Math.min(...valid).toFixed(1)}, maximum ${Math.max(...valid).toFixed(1)} ${unit}`}
          >
            <path className="om-chart-grid" d="M0 15H600M0 77H600M0 140H600" />
            {segments.map((s, i) => (
              <polyline key={i} points={s.join(" ")} />
            ))}
          </svg>
          <p className="om-kpi-trend">
            Min {Math.min(...valid).toFixed(1)} · Max{" "}
            {Math.max(...valid).toFixed(1)} {unit} · Oldest → latest
          </p>
        </>
      ) : (
        <p className="om-empty">No measurements collected yet.</p>
      )}
    </div>
  );
}
export function ServerSummary({ data }: { data: Monitoring }) {
  const s = data.latest?.snapshot;
  return (
    <>
      <div className="om-grid">
        <div className="om-card">
          <small>Host CPU</small>
          <strong>{s?.cpu == null ? "—" : `${s.cpu.toFixed(1)}%`}</strong>
          <Badge value={data.stale ? "stale" : "healthy"} />
        </div>
        <div className="om-card">
          <small>Memory used</small>
          <strong>{bytes(s?.memoryUsed)}</strong>
          <span>of {bytes(s?.memoryTotal)}</span>
        </div>
        <div className="om-card">
          <small>Disk used</small>
          <strong>{bytes(s?.diskUsed)}</strong>
          <span>of {bytes(s?.diskTotal)}</span>
        </div>
        <div className="om-card">
          <small>Database latency</small>
          <strong>{data.databaseLatencyMs} ms</strong>
          <span>Measured on this refresh</span>
        </div>
      </div>
      {data.stale && (
        <Feedback error="Host monitoring is unavailable or stale. Last-known readings are not current health evidence." />
      )}
    </>
  );
}
export function Servers() {
  const [hours, setHours] = useState(24);
  const { data, error } = useResource<Monitoring>(
    `servers?hours=${hours}`,
    15000,
  );
  const s = data?.latest?.snapshot;
  return (
    <>
      <PageTitle
        title="Servers"
        description="The hardware and services behind Blomoon."
      >
        <select
          aria-label="Monitoring period"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
        >
          <option value={1}>Last hour</option>
          <option value={24}>Last 24 hours</option>
          <option value={168}>Last 7 days</option>
        </select>
      </PageTitle>
      <Feedback error={error} />
      {!data ? (
        <Loading />
      ) : (
        <>
          <ServerSummary data={data} />
          <div className="om-columns">
            <MetricChart
              times={data.history.map((h) => h.received_at)}
              sampleIntervalMs={
                hours === 1 ? 15000 : hours === 24 ? 300000 : 1800000
              }
              title="CPU utilization"
              values={data.history.map((h) => h.snapshot.cpu)}
            />
            <MetricChart
              times={data.history.map((h) => h.received_at)}
              sampleIntervalMs={
                hours === 1 ? 15000 : hours === 24 ? 300000 : 1800000
              }
              title="Memory utilization"
              values={data.history.map((h) =>
                h.snapshot.memoryUsed !== null && h.snapshot.memoryTotal
                  ? (100 * h.snapshot.memoryUsed) / h.snapshot.memoryTotal
                  : null,
              )}
            />
            <MetricChart
              times={data.history.map((h) => h.received_at)}
              sampleIntervalMs={
                hours === 1 ? 15000 : hours === 24 ? 300000 : 1800000
              }
              title="Network ingress"
              unit="MB/s"
              values={data.history.map((h) =>
                h.snapshot.networkRxBytesPerSecond === null
                  ? null
                  : h.snapshot.networkRxBytesPerSecond / 1024 ** 2,
              )}
            />
            <MetricChart
              times={data.history.map((h) => h.received_at)}
              sampleIntervalMs={
                hours === 1 ? 15000 : hours === 24 ? 300000 : 1800000
              }
              title="Network egress"
              unit="MB/s"
              values={data.history.map((h) =>
                h.snapshot.networkTxBytesPerSecond === null
                  ? null
                  : h.snapshot.networkTxBytesPerSecond / 1024 ** 2,
              )}
            />
            <MetricChart
              times={data.history.map((h) => h.received_at)}
              sampleIntervalMs={
                hours === 1 ? 15000 : hours === 24 ? 300000 : 1800000
              }
              title="Disk reads"
              unit="MB/s"
              values={data.history.map((h) =>
                h.snapshot.diskReadBytesPerSecond === null
                  ? null
                  : h.snapshot.diskReadBytesPerSecond / 1024 ** 2,
              )}
            />
            <MetricChart
              times={data.history.map((h) => h.received_at)}
              sampleIntervalMs={
                hours === 1 ? 15000 : hours === 24 ? 300000 : 1800000
              }
              title="Disk writes"
              unit="MB/s"
              values={data.history.map((h) =>
                h.snapshot.diskWriteBytesPerSecond === null
                  ? null
                  : h.snapshot.diskWriteBytesPerSecond / 1024 ** 2,
              )}
            />
          </div>
          <div className="om-panel">
            <h2>Blomoon services</h2>
            <div className="om-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>State</th>
                    <th>Health</th>
                    <th>CPU</th>
                    <th>Memory</th>
                    <th>Restarts</th>
                  </tr>
                </thead>
                <tbody>
                  {s?.services.map((v) => (
                    <tr key={v.name}>
                      <td>{v.name}</td>
                      <td>
                        <Badge value={v.state} />
                      </td>
                      <td>
                        <Badge value={v.health} />
                      </td>
                      <td>
                        {v.cpu === null
                          ? "Unavailable"
                          : `${v.cpu.toFixed(1)}%`}
                      </td>
                      <td>{bytes(v.memoryBytes)}</td>
                      <td>{v.restarts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!s?.services.length && (
                <p className="om-empty">
                  No service readings. Install or check the host collector.
                </p>
              )}
            </div>
          </div>
          <div className="om-panel">
            <h2>Host details</h2>
            <ul className="om-list">
              <li>
                Last collected<span>{date(s?.sampledAt)}</span>
              </li>
              <li>
                Uptime
                <span>
                  {s?.uptime == null
                    ? "Unavailable"
                    : `${(s.uptime / 86400).toFixed(1)} days`}
                </span>
              </li>
              <li>
                Load · 1 / 5 / 15 minutes
                <span>
                  {s?.load?.map((v) => v.toFixed(2)).join(" / ") ??
                    "Unavailable"}
                </span>
              </li>
              <li>
                Swap
                <span>
                  {bytes(s?.swapUsed)} / {bytes(s?.swapTotal)}
                </span>
              </li>
              <li>
                Release<span>{s?.release?.slice(0, 12) ?? "Not reported"}</span>
              </li>
              <li>
                Latest completed backup
                <span>
                  {date(s?.backup?.completedAt)} · {bytes(s?.backup?.bytes)}
                </span>
              </li>
            </ul>
          </div>
        </>
      )}
    </>
  );
}
