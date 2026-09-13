import { parseEnv } from "node:util";

export function productionConfig(contents, registry, tag) {
  const env = parseEnv(contents);
  const required = ["BLOMOON_DOMAIN", "TRAEFIK_ACME_EMAIL", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "BETTER_AUTH_URL", "BETTER_AUTH_SECRET", "RESEND_API_KEY", "BLOMOON_AUTH_EMAIL_FROM"];
  for (const key of required) {
    if (!env[key]?.trim()) throw new Error(`Missing production setting: ${key}`);
  }
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/i.test(env.BLOMOON_DOMAIN)) throw new Error("BLOMOON_DOMAIN must be a DNS hostname");
  if (env.BETTER_AUTH_URL !== `https://${env.BLOMOON_DOMAIN}`) throw new Error("BETTER_AUTH_URL must equal https://BLOMOON_DOMAIN without a trailing slash");
  if (env.BETTER_AUTH_SECRET.length < 32) throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(env.POSTGRES_USER) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(env.POSTGRES_DB)) throw new Error("Database name and user must be simple SQL identifiers");
  if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET)) throw new Error("Configure both Google credentials or neither");
  if (Boolean(env.GHCR_USERNAME) !== Boolean(env.GHCR_TOKEN)) throw new Error("Configure both GHCR credentials or neither");
  if (!/^[a-f0-9]{40}$/.test(tag ?? "")) throw new Error("Deploy an immutable 40-character commit SHA");
  if (!/^ghcr\.io\/[a-z0-9._/-]+$/.test(registry ?? "")) throw new Error("Set BLOMOON_REGISTRY_IMAGE to ghcr.io/owner/repository");
  if (env.BLOMOON_RADIO_HEALTH_MODE && !["observe", "enforce"].includes(env.BLOMOON_RADIO_HEALTH_MODE)) throw new Error("BLOMOON_RADIO_HEALTH_MODE must be observe or enforce");
  if (env.BLOMOON_ADMIN_USER_IDS?.split(",").some(id => id.trim() && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim()))) throw new Error("BLOMOON_ADMIN_USER_IDS must contain account UUIDs");
  env.BLOMOON_IMAGE = `${registry}:${tag}`;
  env.BLOMOON_MIGRATE_IMAGE = `${registry}-migrate:${tag}`;
  env.DATABASE_URL = `postgres://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@postgres:5432/${encodeURIComponent(env.POSTGRES_DB)}`;
  return env;
}
