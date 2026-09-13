# Omnisire administration

Omnisire is the owner workspace at `/omnisire`. The old `/admin/radio` and `/api/admin/radio` resources return 404. Sign in normally with a verified account listed in `BLOMOON_ADMIN_USER_IDS`; the same check protects every administration API. There are no default owner accounts, bypass tokens, or public enrollment endpoints.

## Deployment

1. Back up the database and apply `npm run db:migrate`. Migration 0018 adds administration storage, imports existing radio audit records, preserves the current curated stream set, and adds suspension/registration guards. Run `npm run db:check` afterward.
2. Deploy the app and both catalog/health workers from the same revision. Workers consume administrator jobs from PostgreSQL; requests never spawn server processes from the web app.
3. Keep `BLOMOON_ADMIN_USER_IDS` and `BETTER_AUTH_URL` configured. Add a separate `BLOMOON_COLLECTOR_TOKEN`, at least 32 random characters, to the production environment. Restart the app through the normal deployment process to load it.
4. Install the collector below. Open `/omnisire/servers` and confirm fresh readings. Verify the reported hardware against host readings and confirm each expected Docker service appears.

The initial application settings preserve existing behavior: maintenance off, registrations open, all installed modes enabled, existing support email, and no announcement. A mode's verification policy uses its deployment setting until an owner saves an explicit override. Saved settings take precedence and are versioned: stale forms receive a conflict instead of overwriting newer changes.

## Host collector

The collector requires Linux, Node.js 24+, and Docker CLI access. It runs on the VPS host, not in the app container. It has no inbound listener and accepts no commands from Omnisire. It publishes only an allowlisted metric structure; Docker inspection environment variables, credentials, logs, and command lines are never sent.

Install the script at `/opt/blomoon/collector/omnisire-collector.mjs`. Copy `deploy/omnisire-collector.service` into `/etc/systemd/system/`. Set the service's `User` to the existing deployment user, which already has Docker access and can read the deployment/backup directories. Set `ExecStart` to the host's Node.js 24+ executable if it is not `/usr/bin/node`. Keep the collector script and unit administrator-owned.

Create `/etc/blomoon/collector.env` with mode 0600, readable by the service manager:

```dotenv
BLOMOON_COLLECTOR_ORIGIN=https://blomoon.ir
BLOMOON_COLLECTOR_TOKEN=<same separate random token configured on the app>
BLOMOON_DEPLOY_DIR=/opt/blomoon
```

Then run:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now omnisire-collector.service
sudo systemctl status omnisire-collector.service
```

For a foreground installation check, supply these same environment settings and run `node scripts/omnisire-collector.mjs --sample`. This prints only allowlisted measurements and does not transmit a sample. The normal collector sends samples every 15 seconds. Missing Docker access or unreadable deployment metadata is reported as unavailable, never invented. CPU/rate measurements require two samples. Disk capacity measures the filesystem containing `BLOMOON_DEPLOY_DIR`; disk I/O measures supported whole-device Linux counters, and network rates exclude loopback and Docker bridge interfaces.

The current deployment release comes from `current-release.json`; the newest completed `.dump` file supplies backup metadata. These are metadata checks, not restore verification. The panel cannot create backups, restart services, deploy code, restore databases, or execute shell commands.

Samples are stored for seven days and downsampled at query time. One-hour charts use 15-second buckets, 24-hour charts five-minute buckets, and seven-day charts 30-minute buckets. Readings older than 60 seconds are stale. Each collector token is scoped to ingestion, not owner APIs; it cannot read accounts or change settings. Rotation requires updating both the app environment and the collector environment, then restarting each through their normal operators.

## Operation

- **Media:** search/filter a paginated catalog, edit or create stations, attach up to ten direct-audio sources, block/unblock with reasons, and request source checks. Bulk operations process at most 25 items and report individual failures. Saved references survive blocking, while discovery and new playback resolution reject blocked items. Provider refreshes preserve curated edits and blocks.
- **Modes:** disable installed media modes and inspect catalog freshness, verified coverage, worker heartbeat, and check outcomes. Adding another media mode requires its own server adapter and editor registration; shared panels do not import provider response shapes.
- **Users:** suspend/restore users or revoke sessions. Suspension removes existing sessions and prevents new ones, including racing session inserts. Configured owners cannot be suspended. No account deletion or role editing is provided.
- **Jobs:** catalog syncs are durable, deduplicated operations. Workers use leases, heartbeat renewal, three bounded attempts, and stale-token rejection. Failed operations may be retried. Stream recheck jobs wait for the actual check outcomes; successful job execution can report failed streams. Per-source five-minute recheck limits still apply. All sources are also checked on their existing health schedule; aggregate scheduled progress is visible through the health counters rather than millions of individual audit entries.
- **Settings:** maintenance gates public business APIs and the globe, with owner preview and login/health exceptions. Closing registration affects new password and social accounts while preserving existing-user login. Announcements are plain text, optionally expiring. Clients refresh application access every 15 seconds and stop playback when access is removed or a playing station becomes blocked. Previously issued third-party stream URLs cannot be revoked.
- **Activity:** audit history is permanent. Operational events contain static event identifiers and HTTP status, never request bodies or raw logs. Operational events expire after seven days. Current issues highlight stale collection, unhealthy services, overdue workers/catalogs, and failed jobs. External notifications are not configured.

## Verification and recovery

Run `npm run typecheck`, `npm test`, and `npm run build`. Integration tests require a disposable database with all migrations applied:

```sh
DATABASE_URL=<disposable-database-url> OMNISIRE_INTEGRATION=1 RADIO_HEALTH_INTEGRATION=1 RADIO_DIRECTORY_INTEGRATION=1 npm test -- src/lib/admin/integration.test.ts src/lib/modes/radio/health/integration.test.ts src/lib/modes/radio/directory.integration.test.ts src/lib/modes/radio/identity.integration.test.ts
```

The tests roll back their data. Rehearse migrations on an empty database and repeat them to verify idempotency; rehearse backup restoration into a separate database. Never run these checks against production.

If ingestion stops, inspect the collector service and its HTTP status messages, verify its token configuration, then inspect database readiness. If jobs remain queued, check the corresponding worker. A crashed worker's expired job lease can be reclaimed; an older lease cannot publish over its replacement.

Omnisire depends on PostgreSQL for authentication and historical state. A database outage can make the panel itself unavailable. Keep external `/api/health` and `/api/ready` monitoring; the admin interface cannot diagnose a total VPS or database outage from inside that failed system.
