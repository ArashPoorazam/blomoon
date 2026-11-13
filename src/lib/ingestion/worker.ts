import "server-only";
import { runIsolatedFetch } from "./isolation";
import { failureCode, IngestionError } from "./errors";
import type { ApplyDocument, IngestionStore } from "./store";

/** apply must use ONLY the supplied transaction; external side effects cannot be made exactly-once. */
export async function runIngestionOnce(store: IngestionStore, signal: AbortSignal, apply?: ApplyDocument) {
  signal.throwIfAborted();
  const job = await store.claim();
  if (!job) return false;
  const lifetime = new AbortController();
  const combined = AbortSignal.any([signal, lifetime.signal]);
  let heartbeating = false;
  let heartbeat: Promise<void> = Promise.resolve();
  const timer = setInterval(() => {
    if (heartbeating) return;
    heartbeating = true;
    heartbeat = store.heartbeat(job).then(valid => { if (!valid) lifetime.abort(); })
      .catch(() => lifetime.abort()).finally(() => { heartbeating = false; });
  }, 10_000);
  try {
    const result = await runIsolatedFetch(job.source, store, combined);
    if (combined.aborted) throw new IngestionError("cancelled");
    await store.complete(job, result, apply);
  } catch (error) { await store.fail(job, failureCode(error)); }
  finally { clearInterval(timer); lifetime.abort(); await heartbeat; }
  return true;
}
