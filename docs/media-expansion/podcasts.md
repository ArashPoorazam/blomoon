# Curated podcast ingestion (P06)

This increment adds catalog storage and an RSS 2.0 adapter, without registering the podcast UI mode or enabling real sources. The user subsequently approved Podcast Index, Hacker Public Radio and LINUX Unplugged on 2026-11-13. See [source records and directory contract](podcast-sources.md) for approval, attribution, free API access and the bounded larger-feed profile.

## Identities and normalization

`podcast_shows` and `podcast_episodes` use shared `media_items` UUIDs. A privileged operator first configures a P05 feed source and calls `bindCuratedFeed(db, sourceId, provenance, attribution)`. Binding is atomic and idempotent. It creates a pending show, records provenance/attribution, and reserves the original feed URL. Use the same source ID when calling `configureSource` to move a feed; its revision fencing invalidates old workers and clears conditional validators. Never configure a new source just because its URL moved.

Successful ingestion reserves both configured and approved redirect URLs as aliases. A URL already owned by another feed fails the entire transaction; neither names nor matching enclosure URLs merge shows. Redirects do not rewrite curation configuration or broaden the approved origins. An operator must approve a different origin before migration. `itunes:new-feed-url` does not authorize an automatic move.

Episodes use a SHA-256 key of the exact trimmed GUID, scoped to the durable show ID. A stable item link is the fallback when GUID is missing. Missing both fails the feed, instead of manufacturing identity from a mutable title or enclosure. A later GUID replacement requires explicit operator alias reconciliation; it is not automatically guessed. Identical duplicate items are coalesced; conflicting duplicate identities fail the feed. Shared provider primary keys are kind-prefixed; provider aliases retain distinct show/episode namespaces.

The adapter accepts RSS 2.0 with audio enclosures, at most 1,000 items per document and eight enclosures per item, under P05's XML limits and default byte/time limits, with the explicit LINUX Unplugged profile documented in the source records. Atom/RDF, video-only items, missing titles/enclosures and unsafe URL schemes fail without publication. Missing optional metadata is null. Invalid dates/durations are null, explicit flags remain nullable, and imported description HTML uses P05's strict sanitizer. Geography stays unknown; language never manufactures globe coordinates.

Enclosure URL changes update the existing episode. Previous enclosures remain inactive for inspection. Items omitted by a rolling or empty feed retain metadata and active enclosures; omission is not evidence of deletion or unavailability. User saves/history/folders are never rewritten. HTTP enclosures are retained as publisher metadata, but this step does not authorize playback or claim browser compatibility; P08 must enforce supported delivery. No enclosure is fetched by ingestion.

## Worker, freshness and permissions

Apply additive migration `0022_podcast_catalog.sql` after 0020/0021. It seeds catalog mode/provider records only; the client registry stays radio-only. Run the operator role setup `scripts/ingestion-role.sql` once, then `scripts/podcast-ingestion-role.sql` once. For an existing P05 installation, apply only the latter. Grant `blomoon_podcast_ingestion` to a dedicated LOGIN provisioned separately. Its parent grants the P05 queue privileges, and its catalog grants use RLS plus restricted media update columns; it cannot read accounts, mutate radio rows, change source URLs, change curation provenance or delete saved references.

```sh
npm run ingestion:build
# Set BLOMOON_INGESTION_DATABASE_URL to the dedicated podcast worker login.
npm run ingestion:worker -- --podcasts --once
npm run ingestion:worker -- --podcasts
```

`--podcasts` supplies the catalog callback to P05's atomic completion transaction. Use this option for bound podcast feeds; the generic P05 worker only stores XML snapshots. Feed jobs lacking a curated binding fail safely in podcast mode. Guide jobs retain P05 snapshot handling. Do not deploy competing generic and podcast workers on the same podcast queue.

Successful feeds with an episode in the last seven days poll hourly; inactive/undated feeds poll daily, with P05 jitter. That interval persists through 304 responses. P05 bounds retries/backoff and retains exhausted jobs. Failures leave the previous document/catalog/validators intact; no outage erases episodes. `podcastIngestionStatus(db)` returns up to 100 source/show IDs, enabled state, last success, next run and last job outcome without raw URLs or documents. The existing `--failed` command provides bounded failure inspection. P09 owns the administration UI.

The callback is trusted application code running inside the lease-fenced DB transaction. All normalization precedes domain writes; SQL failure or lease expiry rolls everything back. Fetching and XML parsing retain P05 child-process isolation. Raw source/enclosure URLs stay in server persistence and must not be logged or blindly exposed by later discovery APIs.

## Verification and rollback

Use Node 26.12.1 and a disposable PostgreSQL 17 cluster. The migration checker creates/removes only randomly named databases:

```sh
P06_DISPOSABLE=1 P06_TEST_DATABASE_URL=postgres://test-user@127.0.0.1:55446/postgres \
  node --import tsx scripts/check-podcast-migration.mts
DATABASE_URL=postgres://test-user@127.0.0.1:55446/blomoon_p06_suite npm run db:migrate
DATABASE_URL=postgres://test-user@127.0.0.1:55446/blomoon_p06_suite \
  PODCAST_INTEGRATION=1 npm test -- src/lib/modes/podcasts/catalog.integration.test.ts
```

Tests cover repetition, fresh/upgrade/retry, preserved radio/account data, stable saved episode identity, rolling feeds, corrections, migrations/redirects, collisions, stale completion, malformed feed rollback, 304 and scoped worker permissions. See [P06 evidence](evidence/P06.md) for actual results and limitations. No real-provider, physical-device or load evidence is implied.

For rollback stop podcast workers and keep the additive tables and stored data. The previous radio application remains compatible. Do not drop catalog tables or reverse migrations. No production service is enabled by this change.


## Live acceptance command

Build the isolated worker, create a **fresh** disposable local PostgreSQL 17 database named `blomoon_p06_live_<suffix>`, then migrate it. This opt-in command fetches both approved feeds twice at normal volume, checks stable episode IDs, runs directory search/lookup, and links directory identities twice without changing show IDs. It fetches no audio and rejects a nonempty source catalog.

```sh
P06_LIVE_DISPOSABLE=1 P06_TEST_DATABASE_URL=postgres://test-user@127.0.0.1:55446/blomoon_p06_live_example \
  node --conditions=react-server --import tsx scripts/check-podcast-live.mts
```

`--linux-only` allows focused diagnosis without repeating HPR requests. Live checks are never part of the default test suite. Do not use a production DB URL.

## Discovery and show pages (P07)

The registered Podcasts mode reads only the approved, locally ingested catalog. It does not forward public searches to Podcast Index or automatically approve directory results. Use the mode's search box for text, `language:fa`, `topic:technology`, or a quoted topic such as `topic:"social science"`; country selection also filters the catalog. Language filters match complete tags and regional subtags, rather than arbitrary substrings. RSS and iTunes categories are retained as topics on the next successful feed refresh. Existing feeds without categories remain discoverable by text/language.

`/podcasts/<show UUID>` and the existing `/share/stations/podcasts/<show UUID>` open the same show profile, including publisher attribution, author/licence notices, freshness and paginated episodes. Feed moves and enclosure corrections retain these UUIDs. Blocked/disabled sources leave an unavailable profile at the saved link and are excluded from discovery. Stale data (last success older than 48 hours) remains visible with a notice. Podcast playback, follows, saves and listening state are implemented in [P08](podcast-listening.md), with device/provider acceptance still pending.

Authenticated, verified accounts can use `/api/modes/podcasts/search`, `/points`, `/points/<UUID>` and `/points/<UUID>/episodes`. Maintenance, mode disabling, session revocation/suspension and item/source eligibility apply. APIs use no-store responses and omit feed/enclosure URLs and internal provenance. Show/episode pages allow 1–50 records; the UI requests 25 episodes. Globe results cap at 500 verified locations; unknown geography stays in the list without a marker. There are no new schema migrations or production source changes.

Search folds NFKC, letter case, Arabic yeh/alef maksura/kaf to Persian yeh/kaf, vowel marks, tatweel and joiners. Title sorting uses the same normalization and PostgreSQL C collation with UUID tie-breaking: deterministic across hosts, not locale-specific dictionary order. Episodes sort by publication descending, undated last, UUID tie-break. Pagination uses repeatable-read queries plus a matching-set revision fingerprint; catalog changes yield 409 and clients replace the list from page one. This deliberately favors a fresh consistent list over retaining an old browsing snapshot. Search strings, page sizes and offsets are bounded, and paginated DB statements have a 1.5-second timeout. [P07 evidence](evidence/P07.md) records local query plans; it is not a concurrency/capacity claim.

Rollback: remove/disable the podcast mode and retain the additive catalog and all saved data. Existing radio APIs, identities and playback remain unchanged. No migration reversal is needed.
