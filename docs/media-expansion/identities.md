# Discovery, playable identities and geography (P03)

The shared catalog now distinguishes `station`, `show`, `episode` and `channel`. A show is discoverable and followable; episodes, stations and channels are playable and saveable. [Identity contracts](../../src/lib/modes/identity.ts) encode those distinctions; [discovery DTO validation](../../src/lib/modes/discovery.ts) retains kind when projecting into list presentation. Legacy radio DTOs may omit kind; the database defaults existing radio writes to `station`. Show rows open details rather than playback and do not expose episode-save controls. The audio hook also rejects shows. P07/P08 implement actual show pages, follow persistence and controls.

## Storage and references

- `media_items.id` remains the durable, globally unique internal UUID. Existing radio IDs, provider IDs, folder references, share tokens, clicks and daily playback history are unchanged. Never derive a new UUID from a changed enclosure URL or title.
- Radio continues to resolve its existing `radio_station_aliases` ledger and consolidation triggers. The new alias table does not replace or copy that ledger.
- `media_identity_aliases` keys new provider identities by `(mode_id, kind, provider_id, provider_item_id)`. Composite foreign keys bind aliases to the same mode/kind and provider. Multiple provider keys may resolve to the same internal item. Identical natural show/episode IDs do not collide. Alias retargeting is a transactional domain-adapter operation; do not automatically merge records by name.
- The legacy `(provider_id, provider_item_id)` primary-provider uniqueness remains for compatibility. New adapters must namespace the primary `media_items.provider_item_id` by kind (for example `show:<opaque-key>` and `episode:<opaque-key>`) and retain the unmodified natural key in the alias table. Provider IDs remain globally namespaced by mode. Resolver: [identities.ts](../../src/lib/persistence/identities.ts).
- `media_items.kind` and mode are immutable. Core modes have explicit kind constraints; custom plugin modes remain supported. Additional future kinds require a migration and contract update.
- P06 show/episode domain records and P10 channel records should use the shared UUID as their primary/foreign key, just as `radio_stations.media_item_id` does. Episode-to-show parentage, feed/enclosure identities and source variants belong to those domain tables. P03 does not introduce speculative feed or channel schemas.
- Folders, saved items and daily history remain keyed by the internal UUID. Database guards reject shows in saved items, folder items and playback history. Show follows get a separate `(user_id, show_id)` relation in P08; episode progress is distinct from daily start history. No follow is migrated into an episode save.
- Existing `/share/stations/<mode>/<id>` links remain compatible; the path is a legacy route name, not an entity-kind assertion. Resolution uses the mode and internal item ID, never coordinates. New modes must hydrate their own kind and aliases when registered. No podcast/TV mode or live source is enabled in P03.

## Unknown locations

All geographic fields can be null in shared storage. Latitude, longitude and precision must be all present or all absent. Country metadata alone is allowed and does not create coordinates. DTOs reject partial/out-of-range/nonfinite coordinates; presentation renders missing coordinate text as “Unknown”.

Radio retains its existing exact/country-estimated placement and nonnull geography constraint. No existing station coordinates are rewritten. For new modes, use `locationPrecision: "verified"` only after the adapter establishes publisher/broadcaster location provenance. Retain that provenance in domain source records during P06/P10; language, audience, stream IP or an unverified country is insufficient. Unknown show/channel locations stay searchable and listable. They are excluded from baseline/listed markers, highlights, camera focus, crosshair selection and anchored globe overlays. Zero is a valid coordinate when genuinely verified.

## Migration and rollback

Apply [0020](../../drizzle/0020_media_discovery_identity.sql) before running the changed app. It adds a constant-default kind column (the radio backfill), relaxes shared nullability, introduces checks as `NOT VALID`, validates the existing rows, then adds alias storage and guards. Existing unsupported core-mode data fails validation rather than being silently rewritten. Normal deployed data is radio-only; custom plugins retain their station default.

Drizzle runs this migration transactionally. Validation/DDL takes locks; schedule production migration under the existing deployment procedure after reviewing catalog size and lock budget. A validation failure rolls back the transaction. Re-running `db:migrate` resumes through the journal, not by re-executing individual SQL files. Do not manually rerun non-idempotent SQL outside the migrator.

The prior radio-only revision can read and write its existing data on the expanded schema: radio geography and default kind retain the old requirements. Disable future modes before rolling back to a revision unaware of them. Keep the expanded schema and new data intact; do not restore NOT NULL constraints or drop kind/aliases once new records exist. P03 does not deploy or alter production.

## Disposable verification

The standalone checker requires a **local disposable PostgreSQL 17 cluster** and explicit opt-in. It creates randomly named fresh/upgrade databases, applies the real Drizzle migration journal, seeds representative old data, compares snapshots, repeats migration, tests constraints and removes only its own databases. The supplied connection must have CREATEDB privileges and `pg_trgm` installed. It neither reads `.env` nor uses the application's database URL.

```sh
P03_DISPOSABLE=1 \
P03_TEST_DATABASE_URL=postgres://test-user@127.0.0.1:55437/postgres \
node --import tsx scripts/check-media-identity-migration.mts
```

Run all existing opt-in DB suites against a separate empty disposable migrated database using [the documented procedure](../codebase-refinement.md#verification). Keep these results distinct from physical-device, real-provider and production evidence. See [P03 evidence](evidence/P03.md).
