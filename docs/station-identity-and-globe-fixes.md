# Station identity and drawer/globe fixes

## Root causes and ownership

Radio Browser UUIDs identify provider records, not necessarily distinct channels. Dance Wave! had 20 records across stream formats and conflicting country metadata. Deduplication by UUID and exact stream URL allowed one recommendation per format. The radio-owned identity resolver now groups exact stream matches or normalized channel names on the same station website. Only trailing codec/bitrate labels are removed; regional and channel names, website paths, and stream query parameters are preserved. Unnamed stations and missing websites require matching streams. This is conservative metadata matching, not a guarantee that all real-world duplicates can be identified.

`radio_station_aliases` retains provider records and stream variants, pointing to a stable canonical UUID. Initial representatives use votes, clicks, then UUID; refreshes retain the UUID and use an available variant when necessary. Search entries, recommendation ranking, startup points, and saved references use canonical identities. Unknown provider records are registered under a transaction lock before persistence. Database triggers resolve alias references before unique constraints run.

Catalog publication and account consolidation are atomic. Folder memberships are unioned, saved membership is unique per account, and history remains unique per station/day (legitimate repeat plays on different days remain). Click totals are combined. Aliased media rows are removed only after dependent data is represented on the canonical item. Old station links remain resolvable. Shared/exclusive advisory locks prevent saves racing publication, but writes may briefly wait during publication.

## Layout and globe behavior

- Mobile drawers now use their visible height, anchored above the measured player. Previously a full-height scroll area was translated below the screen. Both pagination controls remain available.
- The save picker reuses the modal shell. Its header stays fixed and only its body scrolls; folder creation replaces the folder-list body. Modal focus is contained and restored, and its stacking order is above the player.
- The active list context comes from drawer navigation. Station detail preserves its parent folder/history/list context. Loading a folder produces no points until that folder is available, rather than substituting all saved stations.
- Listed-only mode renders all unique loaded rows, including loaded pages, with no unrelated selection/playback pins. The control is disabled on non-list screens such as the folder index and account pages.
- Selection and playback highlights are separate from stable base marker batches. Camera focus follows a 450 ms spherical transition; opposite-side targets stay outside the globe, a new selection replaces the destination, manual orbit cancels focus, and reduced motion focuses immediately. Crosshair acquisition waits until motion completes.

## Rollout

1. Back up the database using `pg_dump --format=custom` with restricted backup permissions.
2. Run `npm run db:migrate`.
3. Run `npm run catalog:identities` for a read-only report, then `npm run catalog:identities -- --apply` to consolidate existing data. Run in a maintenance window; it rewrites the active catalog and expires recommendation snapshots. It is safe to rerun.
4. Restart app and catalog worker instances to discard old in-memory datasets; purge externally cached directory responses if applicable. Normal future catalog refreshes apply the same identity policy automatically.
5. Run `npm run db:check` and verify search, saves, folder memberships, history, and old station links.

Do not apply cleanup to production without reviewing the report and retaining a backup. Raw variant records remain in the alias table; deleted account media rows are recoverable from the backup, not by automatically splitting an identity group.

## Verification

Run `npm run typecheck`, `npm test`, and `npm run build`.
Opt-in local PostgreSQL tests roll back all fixture changes:

```sh
RADIO_DIRECTORY_INTEGRATION=1 npx vitest run --no-file-parallelism src/lib/modes/radio/identity.integration.test.ts src/lib/modes/radio/directory.integration.test.ts
```

Coverage includes Dance Wave quality variants, Retro/regional distinctions, old IDs, missing metadata, exact streams with distinct query parameters, membership-preserving consolidation, repeated alias saves, history-day retention, click totals, idempotence, pagination, list/globe equality, and bounded/antipodal camera movement.

A live local API check submitted eight concurrent saves of an already-saved station into a temporary folder: all eight succeeded and the folder contained exactly one membership. The temporary folder was removed afterward; existing saved folders were preserved.

Local browser checks confirmed 50/100 loaded suggestions yield 50/100 globe points, a one-station folder shows only its station (excluding unrelated playback), a scrollable bottom pagination button above the mobile player, and a long picker list that scrolls independently. The automation browser uses SwiftShader software rendering and has slow idle frames; its frame-rate readings cannot establish hardware-accelerated smoothness. Test that on a real mobile device before claiming a measured animation performance improvement.
