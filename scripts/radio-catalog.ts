import { loadEnvConfig } from "@next/env";
import { setTimeout } from "node:timers/promises";
loadEnvConfig(process.cwd());
async function main() {
  const { syncRadioDirectory, CATALOG_REFRESH_MS } = await import("../src/lib/modes/radio/directorySync");
  const { enqueueJob, runNextJob } = await import("../src/lib/admin/jobs");
  const once = process.argv.includes("--once");
  if (once) { console.log(await syncRadioDirectory()); return; }
  let next = 0;
  while (true) {
    try {
      if (Date.now() >= next) { await enqueueJob("radio", "sync", null); next = Date.now() + CATALOG_REFRESH_MS; }
      await runNextJob("radio", "sync", async () => { const result = await syncRadioDirectory(); if (result.status === "busy") throw new Error("Catalog busy"); return JSON.stringify(result); });
    } catch { console.error("Catalog job processing unavailable"); }
    await setTimeout(15000);
  }
}
void main().catch(() => { console.error("Catalog worker failed"); process.exitCode = 1; });
