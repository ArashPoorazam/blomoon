# Omnisire implementation verification

Verified locally on 14 September 2026 against disposable data; production was not changed.

## Automated checks

- TypeScript checking and production build passed.
- Default test run: 57 files passed, 293 tests passed; four database integration files were skipped in that run.
- Separate database integration run: all four files and seven tests passed. Coverage includes settings version conflicts, registration and suspension database guards, owner protection, curation, discovery/playback blocking, retired stream preservation, job deduplication and lease recovery, and monitoring ingestion/history.
- Migration 0018 was applied on a fresh database and migrations were repeated. A custom-format backup was restored into another disposable database; readiness checks passed for all 30 required tables.
- Whitespace checks passed. Shared administration and media modules were reviewed for ownership boundaries and bounded file sizes.

## Exercised flows

- Authenticated desktop and 390-pixel mobile administration pages; mobile settings had no horizontal overflow.
- Station creation, blocking/unblocking, and a durable recheck consumed by the actual health worker. The external KEXP source completed a successful health check.
- Real browser stream resolution, playback, pause, resume, and stop. Blocking the playing station stopped playback on the client's next refresh. Playback error handling is covered by automated tests; a separate live broken-stream scenario was not exercised.
- Saving an announcement updated the public application-state response.
- Maintenance rejected an anonymous business request while permitting owner preview. Disabling a mode rejected its public endpoint. Anonymous administration was rejected, and both old administration addresses returned 404.
- The foreground collector submitted real Linux host readings, which appeared in the server charts. Missing container information remained unavailable.
- No uncaught browser errors were reported during the exercised flows.

## Rollout checks still required

The local database was PostgreSQL 18.6. Production PostgreSQL 17 and Docker service measurements were not exercised because Docker was inaccessible in this environment. The systemd unit was checked, but it was not installed on the VPS. Full collector/worker/database outage rehearsals and every form/error-state combination remain deployment acceptance work.

Follow [the deployment and recovery guide](omnisire.md) to apply the migration, deploy matching application/worker revisions, and install the collector. Verify Docker resource readings against the actual VPS and keep independent liveness/readiness monitoring.
