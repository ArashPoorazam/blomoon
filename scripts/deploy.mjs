import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { productionConfig } from "./production-config.mjs";

const releaseDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = resolve(process.env.BLOMOON_DEPLOY_DIR ?? "/opt/blomoon");
const envPath = resolve(appDir, process.env.BLOMOON_ENV_FILE ?? ".env.production");
const backupOnly = process.argv[2] === "--backup";
let tag = process.argv[2];

try {
  if (backupOnly) {
    const previous = JSON.parse(readFileSync(resolve(appDir, "current-release.json"), "utf8"));
    tag = previous.tag;
    process.env.BLOMOON_REGISTRY_IMAGE = previous.registry;
  }
  const config = productionConfig(readFileSync(envPath, "utf8"), process.env.BLOMOON_REGISTRY_IMAGE, tag);
  const env = { ...process.env, ...config, BLOMOON_DEPLOY_DIR: appDir, BLOMOON_RELEASE_DIR: releaseDir };
  // Compose interpolates from this validated environment. An empty env-file
  // prevents a second, different interpretation of literal secret values.
  const composeArgs = ["compose", "--project-directory", appDir, "--env-file", "/dev/null", "-f", resolve(releaseDir, "compose.prod.yml")];
  const run = (command, args, options = {}) => {
    const result = spawnSync(command, args, { env, cwd: releaseDir, stdio: "inherit", ...options });
    if (result.error || result.status !== 0) throw new Error(`${command} failed; deployment stopped`);
    return result;
  };
  const compose = (...args) => run("docker", [...composeArgs, ...args]);
  compose("config", "--quiet");
  if (backupOnly) {
    compose("--profile", "backup", "run", "--rm", "backup");
    process.exit(0);
  }
  if (config.GHCR_TOKEN) run("docker", ["login", "ghcr.io", "-u", config.GHCR_USERNAME, "--password-stdin"], { input: config.GHCR_TOKEN, stdio: ["pipe", "inherit", "inherit"] });
  compose("pull", "traefik", "postgres", "app", "migrate", "catalog", "health", "backup");
  compose("up", "-d", "--wait", "postgres", "traefik");
  // A fresh database can be backed up too; this also covers legacy installations
  // that have no successful-release marker yet.
  compose("--profile", "backup", "run", "--rm", "backup");
  compose("--profile", "migrate", "run", "--rm", "migrate");
  compose("--profile", "migrate", "run", "--rm", "migrate", "npm", "run", "db:check");
  compose("run", "--rm", "--entrypoint", "npm", "migrate", "run", "health:backfill");
  compose("up", "-d", "--wait", "--wait-timeout", "120", "app", "catalog", "health");
  const origin = `https://${config.BLOMOON_DOMAIN}`;
  let ready = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const response = await fetch(`${origin}/api/ready`, { signal: AbortSignal.timeout(8000) });
      if (response.ok) { ready = true; break; }
    } catch { /* Retry bounded network failures during TLS/startup. */ }
    await setTimeout(5000);
  }
  if (!ready) throw new Error("Public readiness check failed");
  run(process.execPath, [resolve(releaseDir, "scripts/check-production.mjs")], { env: { ...env, BLOMOON_ORIGIN: origin } });
  const marker = resolve(appDir, "current-release.json");
  if (existsSync(marker)) writeFileSync(resolve(appDir, "previous-release.json"), readFileSync(marker), { mode: 0o600 });
  writeFileSync(`${marker}.tmp`, JSON.stringify({ tag, registry: process.env.BLOMOON_REGISTRY_IMAGE, releaseDir, deployedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
  renameSync(`${marker}.tmp`, marker);
  compose("ps");
  console.log(`Blomoon deployed: ${origin} (${tag})`);
} catch (error) {
  // Configuration errors name settings, never their values. Avoid dumping env or Compose output.
  console.error(error instanceof Error ? error.message : "Deployment failed");
  process.exitCode = 1;
}
