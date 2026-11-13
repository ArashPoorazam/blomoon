import { applyPodcastFeed } from "../src/lib/modes/podcasts/catalog";
import postgres from "postgres";
import { setTimeout as delay } from "node:timers/promises";
import { createIngestionStore } from "../src/lib/ingestion/store";
import { assertIngestionRole } from "../src/lib/ingestion/role";
import { runIngestionOnce } from "../src/lib/ingestion/worker";

// Intentionally does not load .env.local or the application's auth/provider credentials.
async function main() {
  const url = process.env.BLOMOON_INGESTION_DATABASE_URL;
  if (!url) throw new Error("BLOMOON_INGESTION_DATABASE_URL is required");
  const client = postgres(url, { max: 3, prepare: false, connect_timeout: 5, onnotice: () => {} });
  const store = createIngestionStore(client);
  const lifetime = new AbortController();
  const stop = () => lifetime.abort();
  process.once("SIGTERM", stop); process.once("SIGINT", stop);
  try {
    const podcasts = process.argv.includes("--podcasts");
    await assertIngestionRole(client, podcasts);
    if (process.argv.includes("--failed")) { console.log(JSON.stringify(await store.failedJobs())); return; }
    do {
      try {
        await store.schedule();
        const worked = await runIngestionOnce(store, lifetime.signal, podcasts ? applyPodcastFeed : undefined);
        if (process.argv.includes("--once")) return;
        await delay(worked ? 100 : 5000 + Math.random() * 1000, undefined, { signal: lifetime.signal });
      } catch {
        if (lifetime.signal.aborted) break;
        if (process.argv.includes("--once")) throw new Error("Ingestion unavailable");
        console.error("Ingestion worker unavailable; retrying.");
        await delay(5000, undefined, { signal: lifetime.signal }).catch(() => {});
      }
    } while (!lifetime.signal.aborted);
  } finally { await client.end({ timeout: 5 }); process.removeListener("SIGTERM", stop); process.removeListener("SIGINT", stop); }
}
void main().catch(() => { console.error("Ingestion worker could not complete."); process.exitCode = 1; });
