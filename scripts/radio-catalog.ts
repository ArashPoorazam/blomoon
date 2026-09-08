import { loadEnvConfig } from "@next/env";
import { setTimeout } from "node:timers/promises";

loadEnvConfig(process.cwd());
async function main() {
const { syncRadioDirectory, CATALOG_REFRESH_MS } = await import("../src/lib/modes/radio/directorySync");
const once = process.argv.includes("--once");
do {
  let delay = CATALOG_REFRESH_MS;
  try {
    console.log(JSON.stringify(await syncRadioDirectory()));
  } catch (error) {
    console.error("Radio catalog refresh failed:", error instanceof Error ? error.message : "Unknown error");
    if (once) process.exit(1);
    delay = 5 * 60 * 1000;
  }
  if (once) process.exit(0);
  await setTimeout(delay);
} while (true);
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Catalog worker failed to start");
  process.exit(1);
});
