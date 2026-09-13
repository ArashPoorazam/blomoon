#!/usr/bin/env node
// Runs on the Linux host, never inside the web container. No inbound listener or commands.
import { readFile, readdir, stat, statfs } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";
const exec = promisify(execFile);
const services = ["app", "postgres", "traefik", "catalog", "health"];
const origin = new URL(
  process.env.BLOMOON_COLLECTOR_ORIGIN ?? "https://blomoon.ir",
);
if (
  origin.protocol !== "https:" &&
  !["localhost", "127.0.0.1"].includes(origin.hostname)
)
  throw new Error("Collector requires HTTPS");
const token = process.env.BLOMOON_COLLECTOR_TOKEN;
if (!token || token.length < 32)
  throw new Error("A collector token of at least 32 characters is required");
const deployDir = process.env.BLOMOON_DEPLOY_DIR ?? "/opt/blomoon";
let previous = null;
const safe = async (fn) => {
  try {
    return await fn();
  } catch {
    return null;
  }
};
const read = (path) => readFile(path, "utf8");
async function command(name, args) {
  return (await exec(name, args, { timeout: 5000, maxBuffer: 1024 * 1024 }))
    .stdout;
}
function memory(text) {
  return Object.fromEntries(
    text
      .trim()
      .split("\n")
      .map((line) => {
        const [key, value] = line.split(":");
        return [key, Number(value.trim().split(/\s/)[0]) * 1024];
      }),
  );
}
function counters(stat, net, disks) {
  const cpu = stat.split("\n")[0].trim().split(/\s+/).slice(1, 9).map(Number);
  let rx = 0,
    tx = 0,
    read = 0,
    write = 0;
  for (const line of net.split("\n").slice(2)) {
    const [iface, data] = line.split(":");
    if (
      !data ||
      iface.trim() === "lo" ||
      /^(veth|docker|br-)/.test(iface.trim())
    )
      continue;
    const values = data.trim().split(/\s+/).map(Number);
    rx += values[0];
    tx += values[8];
  }
  // Linux whole-device names; exclude partitions and virtual loop devices to avoid double-counting.
  for (const line of disks.trim().split("\n")) {
    const v = line.trim().split(/\s+/);
    if (!/^(sd[a-z]+|vd[a-z]+|xvd[a-z]+|nvme\d+n\d+)$/.test(v[2])) continue;
    read += Number(v[5]) * 512;
    write += Number(v[9]) * 512;
  }
  return {
    total: cpu.reduce((a, b) => a + b, 0),
    idle: cpu[3] + cpu[4],
    rx,
    tx,
    read,
    write,
    time: Date.now(),
  };
}
function rate(current, prior, key) {
  const delta = current[key] - prior[key];
  return delta >= 0 ? delta / ((current.time - prior.time) / 1000) : null;
}
function parseBytes(value) {
  const m = /^([\d.]+)(B|KiB|MiB|GiB|TiB|kB|MB|GB)$/.exec(value.trim());
  if (!m) return null;
  return (
    Number(m[1]) *
    {
      B: 1,
      KiB: 1024,
      MiB: 1024 ** 2,
      GiB: 1024 ** 3,
      TiB: 1024 ** 4,
      kB: 1e3,
      MB: 1e6,
      GB: 1e9,
    }[m[2]]
  );
}
async function containers() {
  const ids = (
    await command("docker", [
      "ps",
      "-aq",
      "--filter",
      "label=com.docker.compose.project=blomoon",
    ])
  )
    .trim()
    .split("\n")
    .filter((id) => /^[a-f0-9]+$/.test(id));
  if (!ids.length) return [];
  const inspect = JSON.parse(await command("docker", ["inspect", ...ids]));
  const stats = await safe(async () =>
    (
      await command("docker", [
        "stats",
        "--no-stream",
        "--format",
        "{{json .}}",
        ...ids,
      ])
    )
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((v) => JSON.parse(v)),
  );
  return services.flatMap((name) => {
    const item = inspect.find(
      (c) => c.Config?.Labels?.["com.docker.compose.service"] === name,
    );
    if (!item) return [];
    const usage = stats?.find(
      (s) => item.Id.startsWith(s.ID) || s.Name === item.Name.slice(1),
    );
    return [
      {
        name,
        state: item.State.Status,
        health: item.State.Health?.Status ?? "none",
        restarts: item.RestartCount,
        cpu: usage ? Number(usage.CPUPerc.replace("%", "")) : null,
        memoryBytes: usage ? parseBytes(usage.MemUsage.split("/")[0]) : null,
      },
    ];
  });
}
async function backup() {
  const directory = `${deployDir}/backups`;
  const names = (await readdir(directory)).filter((n) => n.endsWith(".dump"));
  const files = await Promise.all(
    names.map(async (name) => {
      const s = await stat(`${directory}/${name}`);
      return { completedAt: s.mtime.toISOString(), bytes: s.size };
    }),
  );
  return (
    files.sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0] ?? null
  );
}
async function sample() {
  const [
    proc,
    net,
    disks,
    mem,
    load,
    uptime,
    fs,
    serviceData,
    release,
    backupData,
  ] = await Promise.all([
    safe(() => read("/proc/stat")),
    safe(() => read("/proc/net/dev")),
    safe(() => read("/proc/diskstats")),
    safe(async () => memory(await read("/proc/meminfo"))),
    safe(async () =>
      (await read("/proc/loadavg")).split(" ").slice(0, 3).map(Number),
    ),
    safe(async () => Number((await read("/proc/uptime")).split(" ")[0])),
    safe(() => statfs(deployDir)),
    safe(containers),
    safe(async () => {
      const r = JSON.parse(await read(`${deployDir}/current-release.json`));
      return r.tag ?? null;
    }),
    safe(backup),
  ]);
  const current = proc && net && disks ? counters(proc, net, disks) : null;
  const rates =
    current && previous
      ? {
          cpu:
            current.total > previous.total
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    100 *
                      (1 -
                        (current.idle - previous.idle) /
                          (current.total - previous.total)),
                  ),
                )
              : null,
          networkRxBytesPerSecond: rate(current, previous, "rx"),
          networkTxBytesPerSecond: rate(current, previous, "tx"),
          diskReadBytesPerSecond: rate(current, previous, "read"),
          diskWriteBytesPerSecond: rate(current, previous, "write"),
        }
      : {
          cpu: null,
          networkRxBytesPerSecond: null,
          networkTxBytesPerSecond: null,
          diskReadBytesPerSecond: null,
          diskWriteBytesPerSecond: null,
        };
  previous = current;
  return {
    host: "primary",
    sampledAt: new Date().toISOString(),
    uptime,
    load,
    ...rates,
    memoryUsed: mem ? mem.MemTotal - mem.MemAvailable : null,
    memoryTotal: mem?.MemTotal ?? null,
    swapUsed: mem ? mem.SwapTotal - mem.SwapFree : null,
    swapTotal: mem?.SwapTotal ?? null,
    diskUsed: fs ? (fs.blocks - fs.bfree) * fs.bsize : null,
    diskTotal: fs ? fs.blocks * fs.bsize : null,
    release:
      typeof release === "string" && /^[a-f0-9]{40}$/.test(release)
        ? release
        : null,
    backup: backupData,
    services: serviceData ?? [],
  };
}
do {
  const start = Date.now();
  try {
    const snapshot = await sample();
    if (process.argv.includes("--sample")) {
      console.log(JSON.stringify(snapshot));
      break;
    }
    const response = await fetch(new URL("/api/omnisire/collector", origin), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(snapshot),
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (!response.ok)
      console.error(`Collector ingestion returned ${response.status}`);
  } catch {
    console.error("Collector sampling or delivery failed");
  }
  await setTimeout(Math.max(1000, 15000 - (Date.now() - start)));
} while (true);
