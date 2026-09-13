import { loadEnvConfig } from "@next/env";
import { setTimeout } from "node:timers/promises";
loadEnvConfig(process.cwd());
async function main() {
  const { backfillProviderSources } = await import("../src/lib/modes/radio/health/sources");
  const { runHealthBatch } = await import("../src/lib/modes/radio/health/worker");
  if (process.argv.includes("--backfill")) {
    await backfillProviderSources();
    process.exit(0);
  }
  const once = process.argv.includes("--once");
  do {
    try {
      const result = await runHealthBatch();
      if (once) {
        console.log(result);
        process.exit(0);
      }
      await setTimeout(result.paused ? 60_000 : result.checked ? 100 : 5000);
    } catch {
      console.error("Radio health worker failed; retrying in one minute.");
      if (once) process.exit(1);
      await setTimeout(60_000);
    }
  } while (true);
}
void main().catch(() => {
  console.error("Radio health worker could not start.");
  process.exit(1);
});
