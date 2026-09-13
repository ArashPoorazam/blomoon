import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { probeStream } from "./probe";
import { claimStreamSource, completeStreamCheck, releaseStreamClaim } from "./queue";

function limit(name: string, fallback: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`Invalid ${name}`);
  return value;
}
let connectivityCache: { checkedAt: number; connected: boolean } | null = null;
let connectivityCheck: Promise<boolean> | null = null;
async function connectivity(force = false): Promise<boolean> {
  if (!force && connectivityCache && Date.now() - connectivityCache.checkedAt < 60_000)
    return connectivityCache.connected;
  if (connectivityCheck) return connectivityCheck;
  connectivityCheck = checkConnectivity()
    .then((connected) => {
      connectivityCache = { checkedAt: Date.now(), connected };
      return connected;
    })
    .finally(() => {
      connectivityCheck = null;
    });
  return connectivityCheck;
}
async function checkConnectivity() {
  const results = await Promise.allSettled(
    ["https://www.radio-browser.info/", "https://www.cloudflare.com/cdn-cgi/trace"].map((url) =>
      fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000), redirect: "error" }),
    ),
  );
  return results.some((r) => r.status === "fulfilled" && r.value.status < 500);
}
export async function runHealthBatch() {
  const connected = await connectivity();
  await getDb()
    .insert(schema.radioHealthWorker)
    .values({ id: "primary", status: connected ? "running" : "connectivity_failure" })
    .onConflictDoUpdate({
      target: schema.radioHealthWorker.id,
      set: { heartbeat: new Date(), status: connected ? "running" : "connectivity_failure" },
    });
  if (!connected) return { paused: true, checked: 0 };
  const concurrency = limit("BLOMOON_RADIO_PROBE_CONCURRENCY", 16, 64);
  const timeout = limit("BLOMOON_RADIO_PROBE_TIMEOUT_MS", 10_000, 20_000);
  const bytesLimit = limit("BLOMOON_RADIO_PROBE_BYTES", 65_536, 262_144);
  const results = await Promise.all(
    Array.from({ length: concurrency }, async () => {
      const source = await claimStreamSource(concurrency);
      if (!source) return 0;
      const result = await probeStream(source.streamUrl, timeout, bytesLimit);
      // A lost network connection is not evidence that a stream failed.
      if (
        !result.ok &&
        ["connection_failed", "timeout"].includes(result.reason ?? "") &&
        !(await connectivity(true))
      ) {
        await releaseStreamClaim(source);
        await getDb()
          .update(schema.radioHealthWorker)
          .set({ status: "connectivity_failure" })
          .where(eq(schema.radioHealthWorker.id, "primary"));
        return 0;
      }
      await completeStreamCheck(source, result);
      return 1;
    }),
  );
  return { paused: false, checked: results.reduce<number>((a, b) => a + b, 0) };
}
