import "server-only";
import { fork } from "node:child_process";
import { resolve } from "node:path";
import { INGESTION_LIMITS as limits, type FetchResult } from "./contracts";
import type { IngestionSource, IngestionStore } from "./store";
import { IngestionError, type IngestionFailure } from "./errors";

export function isolatedOptions(bundle: string, largePodcastFeed = false) {
  return { execPath: process.execPath, execArgv: ["--permission", `--allow-fs-read=${bundle}`, "--allow-net", largePodcastFeed ? "--max-old-space-size=256" : "--max-old-space-size=128", largePodcastFeed ? "--process-timeout=45s" : "--process-timeout=20s", "--disable-proto=throw", "--no-experimental-sqlite"], env: { NODE_ENV: "production" as const } };
}

/** One bounded child per job; only the DB coordinator handles distributed host-slot leases. */
export async function runIsolatedFetch(source: IngestionSource, store: Pick<IngestionStore, "acquireHost" | "releaseHost">, signal: AbortSignal): Promise<FetchResult> {
  signal.throwIfAborted();
  const bundle = resolve("dist/ingestion-child.cjs");
  const largePodcastFeed = source.id === "1a3bdc6f-598a-4ba6-b341-bc6a9df67a02" && source.url === "https://feeds.jupiterbroadcasting.com/lup";
  const child = fork(bundle, [], { ...isolatedOptions(bundle, largePodcastFeed), stdio: ["ignore", "ignore", "ignore", "ipc"] });
  const allowedHosts = new Set(source.origins.map(origin => new URL(origin).hostname.replace(/^\[|\]$/g, "")));
  const held = new Map<string, string>();
  let handling = Promise.resolve();
  let finished = false;
  let timer: ReturnType<typeof setTimeout>;
  let abort = () => {};
  try {
    return await new Promise<FetchResult>((resolveResult, reject) => {
      const fail = (code: IngestionFailure) => { finished = true; reject(new IngestionError(code)); };
      abort = () => fail("cancelled");
      signal.addEventListener("abort", abort, { once: true });
      timer = setTimeout(() => fail("timeout"), largePodcastFeed ? 45_000 : limits.workerMs);
      child.on("error", () => fail("worker_failed"));
      child.on("exit", () => { if (!finished) fail("worker_failed"); });
      child.on("message", (message: { type?: string; id?: number; action?: string; host?: string; result?: FetchResult; code?: IngestionFailure }) => {
        if (finished) return;
        if (message.type === "result" && message.result) {
          finished = true; resolveResult(message.result); return;
        }
        if (message.type === "error" && message.code) { fail(message.code); return; }
        if (message.type !== "slot" || !Number.isSafeInteger(message.id) || !message.host || !allowedHosts.has(message.host)) { fail("worker_failed"); return; }
        const host = message.host;
        handling = handling.then(async () => {
          if (finished) return;
          let granted = false;
          if (message.action === "acquire" && held.size === 0) {
            const token = await store.acquireHost(host);
            if (token) { held.set(host, token); granted = true; }
          } else if (message.action === "release" && held.has(host)) {
            await store.releaseHost(held.get(host)!); held.delete(host); granted = true;
          } else { fail("worker_failed"); return; }
          if (!finished && child.connected) child.send({ type: "slot", id: message.id, granted }, error => { if (error) fail("worker_failed"); });
        }).catch(() => fail("worker_failed"));
      });
      child.send({ type: "start", kind: source.kind, input: { url: source.url, origins: source.origins,
        largePodcastFeed,
        etag: source.etag, lastModified: source.last_modified, validatorUrl: source.validator_url } }, error => { if (error) fail("worker_failed"); });
      if (signal.aborted) abort();
    });
  } finally {
    finished = true;
    clearTimeout(timer!); signal.removeEventListener("abort", abort);
    // Kill before releasing host slots: a slot must never be reused while its socket remains active.
    const exited = child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise<void>(resolveExit => child.once("exit", () => resolveExit()));
    child.kill("SIGKILL"); await exited;
    await handling;
    await Promise.all([...held.values()].map(token => store.releaseHost(token)));
  }
}
