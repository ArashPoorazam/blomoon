# Blomoon

Discover and play live radio through an interactive globe. Blomoon includes mobile and desktop layouts, station discovery, accounts, favourites, sharing, and playback history. Radio Browser is synchronized by a separate catalog worker; provider fallback is visibly identified. Future modes remain removable media plugins.

## Development

Use Node.js 24 and the committed package lock:

```sh
cp .env.example .env.local
npm ci
# Fill .env.local before running database commands.
npm run db:migrate
npm run db:check
npm run dev
```

Open http://localhost:3000. Password accounts require email verification. Configure Resend with a verified sender in production; `onboarding@resend.dev` is only for local testing. Google sign-in is optional and requires both Google settings.

Run `npm run typecheck`, `npm test`, and `npm run build` before a release. Database integration tests require their documented opt-in settings and a disposable database. Do not run migration or integration checks against production for routine local verification.

## Home Screen installation

On Android, choose **Install Blomoon** on the login page or account menu. Supported browsers show their native installation prompt; otherwise the button explains browser-menu installation. On iPhone/iPad, the button explains Safari → Share → Add to Home Screen, with Open as Web App enabled where shown. Controls disappear in standalone mode; there are no automatic promotional popups.

The manifest, icons, and offline document are public even when logged out. Installed launches use `/` and retain the usual authentication checks. Some browsers may require signing in again after installation.

Production registers `/sw.js`. Only the self-contained `/offline.html` document is cached. Failed network navigations show a reconnect screen; server error responses remain intact. APIs, login responses, user data, Next.js assets and media streams are never put in Cache Storage. Discovery and playback require internet access. Installation does not guarantee uninterrupted background audio.

When changing the offline document, bump `OFFLINE_CACHE` in `public/sw.js`. Updates wait for existing app windows to close and never force a reload during playback. To verify workers locally, build and run production mode on localhost; development does not register workers. Use a separate browser profile/port for production testing to avoid an old worker controlling development.

## Production architecture and prerequisites

Production uses Docker Compose: Traefik with automatic Let's Encrypt HTTPS, PostgreSQL 17 with a persistent volume, a non-root Next.js standalone image, a migration/catalog image, and on-demand backups. The app is not publicly port-mapped; PostgreSQL remains bound to server loopback. Traefik negotiates its Docker API version; the obsolete forced `1.40` override was removed.

The VPS needs Docker Engine, Docker Compose v2.20+ (or v5), **Node.js 24 on the host**, `flock` (util-linux), `tar`, and SSH. Node runs deployment validation and HTTP checks; no host `npm install` is needed. Node may be installed system-wide or as an app-owned distribution at `/opt/blomoon/tools/node` (relative to the configured app directory). The launcher adds that distribution’s `bin` directory to its own executable path. The deployment user needs Docker access and write access to `/opt/blomoon` (or the configured absolute directory). Current CI images target Linux amd64.

Point `blomoon.ir` A records at the VPS. Publish AAAA only if IPv6 works. Allow inbound 80/443 for HTTP redirect and certificate issuance. Keep the canonical origin and `BETTER_AUTH_URL` at `https://blomoon.ir`. A different domain also requires updating the application canonical origin. Set `BLOMOON_WWW_DOMAIN` to the `www` hostname that redirects to the apex domain. Traefik preserves the path and query string when redirecting to the canonical HTTPS origin.

```sh
sudo mkdir -p /opt/blomoon
sudo chown "$USER":"$USER" /opt/blomoon
# Copy the repository's .env.production.example to this location:
cp .env.production.example /opt/blomoon/.env.production
chmod 600 /opt/blomoon/.env.production
```

Fill every required value. Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. Use a strong independent database password. Values use Node's literal dotenv syntax: quote values containing `#`, spaces or newlines. Do not use shell substitutions or `${VARIABLE}` expansion. Deployment encodes database credentials into `DATABASE_URL`; do not construct this URL manually or pre-encode the password. Database name/user must be simple SQL identifiers. Changing credentials in the file does not rotate credentials in an existing PostgreSQL volume.

Set the verified Resend sender and key. For Google OAuth, use `https://blomoon.ir/api/auth/callback/google` as the authorized redirect URI, `blomoon.ir` as the authorized domain, and `/privacy` and `/terms` on that origin as policy URLs. `GHCR_USERNAME` and a read-packages `GHCR_TOKEN` are required only for private registry packages.

For the existing Cloudflare deployment:

- Keep SSL/TLS encryption mode at **Full (strict)**.
- Enable **Always Use HTTPS**.
- Keep proxied DNS records for both `blomoon.ir` and `www.blomoon.ir`.

The VPS-side `www` redirect remains configured as a fallback.

## Release and deployment

GitHub Actions tests/builds `main`, publishes app and migration images, then deploys an exact commit SHA. Configure repository secrets:

- `VPS_HOST`, `VPS_USER`, `VPS_SSH_PRIVATE_KEY`.
- `VPS_SSH_KNOWN_HOSTS`: verified OpenSSH known-hosts entries for the server; for a nonstandard port use `[host]:port`. Obtain and verify the fingerprint through your server console or a trusted channel before setting this secret.
- Optional `VPS_PORT` (default 22) and `VPS_APP_DIR` (default `/opt/blomoon`; use an absolute path without spaces).

Each release uploads its own deployment files into `/opt/blomoon/releases/<commit-sha>`. Secrets, backups, the deployment lock, and current/previous release records stay in `/opt/blomoon`; Docker volumes keep the stable `blomoon` project name. Uploads never overwrite the secret file. Keep old release directories and registry images available for rollback.

Deployment takes a lock, validates settings and Compose, pulls images, starts dependencies, makes a database backup, runs migrations and `db:check`, then starts the app/catalog worker. It waits for readiness and runs the production HTTP checks before recording success. A failed command stops the sequence. Failures after replacement can leave the new containers running: inspect logs and explicitly roll back if appropriate. No automatic database downgrade occurs.

For a manual deployment, place the matching commit's `deploy.sh`, `compose.prod.yml`, and `scripts/` in its release directory, then run:

```sh
BLOMOON_DEPLOY_DIR=/opt/blomoon \
BLOMOON_REGISTRY_IMAGE=ghcr.io/owner/repository \
sh /opt/blomoon/releases/<40-character-sha>/deploy.sh <40-character-sha>
```

Mutable tags such as `main` are rejected by the deployment script. `/api/health` reports process liveness; `/api/ready` tests database connectivity and returns 503 on failure. External catalog availability is checked separately and does not trigger app restart loops.

```sh
BLOMOON_ORIGIN=https://blomoon.ir npm run check:prod
```

Checks cover HTTP-to-HTTPS and `www`-to-apex redirects, auth guards, database readiness, manifest/icons/worker/offline assets, and catalog/search/detail/playable responses. Fixture catalogs produce a warning. Stream resolution failures are warnings unless `BLOMOON_STRICT_PLAYBACK=1`; successful resolution alone does not prove audible playback. Review warnings before accepting a release. Container logs rotate at 10 MB × 3 files per service.

## Backups and recovery

Every deployment makes a PostgreSQL custom-format `.dump` backup, verifies its archive list, and atomically publishes it under `/opt/blomoon/backups`. Failed dumps never publish a completed file. Completed backups are retained for 14 days. Existing legacy `.sql.gz` backups are left intact.

Run a backup using the current release's script:

```sh
BLOMOON_DEPLOY_DIR=/opt/blomoon sh /opt/blomoon/releases/<current-sha>/deploy.sh --backup
```

Schedule this daily using cron or a systemd timer under the deployment user. Resolve the script path from `current-release.json` so the schedule follows releases; for example, save this as an operator-owned script and schedule it at 03:00 daily:

```sh
#!/bin/sh
set -eu
export BLOMOON_DEPLOY_DIR=/opt/blomoon
release_dir=$(node -p 'JSON.parse(require("node:fs").readFileSync("/opt/blomoon/current-release.json","utf8")).releaseDir')
exec sh "$release_dir/deploy.sh" --backup
```

Monitor nonzero exits (including deployment-lock contention) and retry missed backups. Configure an encrypted off-server destination separately; local backups do not protect against VPS loss. No remote backup destination is configured by this repository.

Before launch, restore a completed dump into a **separate disposable PostgreSQL 17 database** with `pg_restore --exit-on-error --no-owner --dbname=<disposable-url> <backup.dump>`, then run `db:check` against it. Archive-list validation is not a restore rehearsal. For actual recovery, stop writers first, preserve the existing database, and restore into an empty replacement database; never blindly restore over live data.

For application rollback, inspect `previous-release.json`, confirm its code is compatible with the current schema, and invoke that release's `deploy.sh` using its recorded registry and SHA. Migration history remains forward-only. If a release introduced an incompatible schema change, use a reviewed forward fix or an explicit database recovery procedure instead.

## Release acceptance

Before the first deployment, verify both Docker targets and rehearse fresh/repeated migrations, backup/restore, and database-outage readiness on disposable infrastructure. CI builds both targets but does not exercise the VPS or physical devices.

On Android Chrome and iPhone Safari, install and relaunch; check icons, standalone layout, keyboard/focus and safe areas, login/logout, sharing links, globe/country/point interaction, and playback start/pause/stop/error. After an online visit, go offline and navigate: the reconnect screen must appear; reconnect and retry. Confirm Cache Storage contains only the offline document. Verify a release update does not interrupt playing audio by forcing a reload. Real-device installation and live-provider playback must be reported separately from simulated browser checks.

## Data sources

Radio: Radio Browser. Country borders: `world-atlas` simplified country geometry, derived from Natural Earth. Public support: `blomoon.support@gmail.com`.
