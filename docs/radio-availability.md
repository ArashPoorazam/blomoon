# Radio catalog and verified availability

Radio discovery reads `radio_directory`, a database view combining the active Radio Browser generation with curated station overrides. All marker, country, search, random and recommendation queries share one eligibility predicate. There is no live-provider or fixture fallback in production discovery. Saved stations remain stored and display their current availability.

## Deployment

1. Apply migrations (`npm run db:migrate`) and backfill existing provider sources (`npm run health:backfill`). Both are additive; backfill does not contact streams or change accounts.
2. Start `npm run catalog:worker` and `npm run health:worker`. Production Compose includes both. The deployment script runs backfill after migrations and before starting app/workers.
3. Start with `BLOMOON_RADIO_HEALTH_MODE=observe`. Catalog discovery and stored-source playback remain usable while checks accumulate. The admin dashboard always reports actual verified coverage.
4. Inspect coverage by country, worker heartbeat, due checks and failure distribution at `/admin/radio`. Then set `BLOMOON_RADIO_HEALTH_MODE=enforce` and restart the app. An unset setting defaults to enforcement; deployment examples explicitly choose observation for the initial rollout. Do not leave observation enabled as the final rollout state.
5. Set `BLOMOON_ADMIN_USER_IDS` to a comma-separated list of verified account UUIDs. Empty configuration grants no access. Access is enforced in both the page and every admin endpoint. `BETTER_AUTH_URL` supplies the allowed mutation origin.

The rollout switch only changes eligibility policy; it does not restore deleted provider discovery paths. Reverting to observation preserves data and keeps the checker running. A full application rollback should leave the additive tables in place.

## Curation and identity

Admins can create stations, edit curated metadata and source URLs, disable stations, and request rechecks. Select an existing provider station to attach streams through a curated override. Duplicate evidenced identities or stream URLs return a conflict instead of creating a second station. Public station UUIDs are reserved in the existing identity registry. Provider synchronization cannot overwrite curated metadata or remove curated streams. Empty catalogs contain no invented entries.

Names, countries, URLs and coordinates are validated. Alpha-2 or known numeric ISO codes are accepted and normalized to the existing globe country contract. Exact coordinates must fall within the chosen country; omitted coordinates use the existing estimated placement. Up to ten stream addresses can be managed per station. Playback returns the two most recently successful eligible sources, matching the existing browser startup budget. Edits and recheck requests create audit records in the same transaction as the mutation.

## Checking and eligibility

A station qualifies when enabled and at least one enabled source succeeded less than 24 hours ago and has fewer than three consecutive failures. New addresses need an initial successful check. Metadata-only refreshes preserve health. Three failures or 24-hour expiry remove a source from eligibility; one successful check restores it.

Healthy streams are checked every six hours, or hourly when recently requested for playback. Failures retry after 5 minutes, 30 minutes, 2 hours and then daily. Scheduling adds up to 10% jitter. Due-time ordering prevents newer popular work from starving overdue sources. Recheck requests are deduplicated per source and limited to one every five minutes. Disabled stations cannot request checks.

The separate worker uses PostgreSQL leases and short claim/publication transactions. Expired leases are reclaimable; results with old lease tokens cannot overwrite a newer result. Defaults are 16 probes, two per source hostname, 10 seconds per probe, 64 KiB of sampled data and three redirects. Redirect destinations also share per-host slots within the worker process. Run one Compose worker per checking region. `BLOMOON_RADIO_PROBE_CONCURRENCY`, `BLOMOON_RADIO_PROBE_TIMEOUT_MS` and `BLOMOON_RADIO_PROBE_BYTES` can adjust bounded process limits.

Probes connect directly to validated public DNS addresses, preserving TLS hostname verification, and validate every redirect. Private, loopback, link-local, reserved and mapped addresses are rejected. Only HTTPS addresses that browser playback uses are checked. HTTP success or an audio content type alone does not pass: the sample must contain recognized direct-audio framing. HLS and playlist formats are unsupported in this release. The checker never proxies listener audio, transcodes, records streams, or continuously listens.

Independent connectivity checks pause work during a worker network outage rather than counting every station as failed. Previously verified sources still expire after 24 hours. The UI shows delayed checks and warming/empty states without silently admitting unverified sources.

## Verification and limits

Run `npm run typecheck`, `npm test`, and `npm run build`. For real PostgreSQL regression tests against a disposable database:

```
RADIO_HEALTH_INTEGRATION=1 RADIO_DIRECTORY_INTEGRATION=1 npm test -- src/lib/modes/radio/health/integration.test.ts src/lib/modes/radio/directory.integration.test.ts src/lib/modes/radio/identity.integration.test.ts
```

The integration tests roll back their changes. They cover source health preservation, alternate recovery, disabled stations, discovery consistency, snapshot revalidation, account identity preservation, audit writes, deduplicated leases and stale-result rejection. Probe tests cover pinned DNS, private redirects, misleading HTTP responses, audio framing and byte/redirect limits.

Checks run from one server region. A check is recent evidence of stream delivery, not a promise of audible playback on every device or network. Region restrictions, intermittent failures and browser codec support still matter. Saved station retries queue checks; they do not override health or instantly certify playback.

### Coverage audit (September 12, 2026)

The production catalog worker reported a successful publication of 42,914 canonical stations at 20:09:21 UTC. Radio Browser subsequently reported 58,416 entries, with 6,390 marked broken. Provider entries and canonical stations are different counts: normalization and identity merging also reduce the catalog. The previous deployment did not retain a detailed normalization-exclusion breakdown, so the remaining difference cannot be attributed precisely from those totals. New scan logs report malformed and normalization-excluded counts per page. World rendering remains capped at 500 points and country markers at 50, independently of catalog coverage.
