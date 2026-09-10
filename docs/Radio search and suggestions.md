Radio Browser remains the provider and playback resolver. The radio directory is a local, normalized copy of usable provider stations; it is independent of saved media and history. Removing an unavailable station from the directory does not delete anyone's favourites.

## Running it

1. Install dependencies with `npm ci`.
2. Apply additive migrations with `npm run db:migrate` (requires permission to install PostgreSQL `pg_trgm`).
3. Run `npm run catalog:sync` for the initial directory. The command loads local Next.js environment configuration.
4. Run `npm run catalog:worker` for periodic refreshes. Production Compose starts the `catalog` service using the migration image; `deploy.sh` starts it after applying migrations.

The worker runs immediately, then every six hours after success, or five minutes after failure. Each provider scan has a 15-minute budget, pages of at most 5,000 stations, 30-second request timeouts, and a 100,000-station safety ceiling. A PostgreSQL advisory lock prevents concurrent synchronizations. Scans use one provider host throughout; host failure discards that scan before trying another host. Provider pages are ordered by name and deduplicated by UUID.

Malformed responses, fewer than 1,000 usable stations, or a count below 80% of the previous directory or provider's usable count prevent publication. These deliberately conservative guards require review if the provider changes substantially. Provider pagination is not an atomic upstream snapshot; these guards detect major truncation, not every concurrent upstream edit.

Entries, searchable vocabulary and the active-generation switch publish in one transaction. Previous generations expire after 24 hours. Personal recommendation snapshots expire after one hour, with at most eight retained per owner. No directory cleanup touches saved stations or history.

Before a complete catalog exists, the isolated bootstrap fallback uses the existing provider/fixture flow and explicitly says search coverage is limited. A catalog older than 12 hours displays its last successful update date. Directory-backed behavior activates automatically after publication. Stopping the worker retains the last complete catalog.

## Search

`GET /api/modes/radio/search?q=...&countryCode=...&sort=relevance&limit=50&offset=0`

The country-scoped search endpoint uses the same matcher. Existing vote sorts remain supported. Omitting the sort uses relevance for a typed query and most votes otherwise.

Normalization handles case, accents, punctuation, whitespace and Persian/Arabic kaf/yeh variants. Each query term can match a different field: station name, country names/aliases, language, or tags. Country selection remains a strict ISO-code filter. Country phrases are preserved as searchable text, not interpreted as exclusive filters from individual words.

Exact station names rank first, then station phrases/prefixes, then matching country/language/tag phrases. Trigram indexes retrieve spelling candidates from the catalog vocabulary; bounded Damerau–Levenshtein distance accepts one typo for four/five-letter terms or two for longer terms. Shorter queries use indexed word-prefix matching. Partial substrings remain supported for longer terms. Popularity breaks comparable relevance ties. There is no AI service or external search subscription.

## Suggestions

`GET /api/modes/radio/recommendations?limit=50&offset=0`

The response extends the existing point page with `recommendation.kind` (`personalized` or `discovery`) and `pageToken`. Pass that token with subsequent offsets. Invalid/expired tokens or tokens owned by another user return 409 without exposing the owner's identity. Responses use `private, no-store`.

Distinct saved stations contribute four preference units. Each existing history entry contributes one unit with a 14-day half-life, capped at three history units per station. Saving in multiple folders has no additional influence. History is still the existing latest 50 station/day entries; no new listening-duration or guest tracking is collected.

Preferences combine tags (60%), languages (25%) and countries (15%). Common catalog tags are downweighted. Final candidate scores combine preference match (90%) and logarithmic provider popularity (10%). These weights are explicit v1 defaults, not measured claims of recommendation quality.

Each 50-station page aims for 35 unfamiliar matching stations, ten familiar stations and five broader discoveries. Country/tag repetition lowers selection priority, streams and IDs are deduplicated, and shortages fill from available pools. Cold starts use a diverse daily-seeded general selection. At most 500 results are retained in each snapshot; counts describe that selection, not the whole directory.

Only the unfiltered home list defaults to suggestions. Country lists default to votes; typed searches default to relevance. Home sorting is restored when those constraints clear. Playback and favourite edits do not move the current list. Reload or “Refresh suggestions” applies updated signals; an unchanged profile can reuse a still-valid snapshot. Account changes clear displayed list state and discard late requests from the previous account.

## Verification and monitoring

- `npm run typecheck`, `npm test`, and `npm run build`.
- `RADIO_DIRECTORY_INTEGRATION=1 npx vitest run src/lib/modes/radio/directory.integration.test.ts` exercises PostgreSQL search and snapshot isolation with all fixture writes rolled back. Run after migration against a local development database.
- `node scripts/verify-radio-discovery.mjs` exercises real catalog search, stable authenticated pagination and guest rejection, and prints warm API p95 timings. It uses an existing verified local session without printing credentials. `--browser` initializes the local verification browser with that session. Override the local URL with `BLOMOON_VERIFY_URL`.
- Watch `radio.directory.page`, `radio.directory.published`, `radio.directory.scan_failed`, `radio.directory.unavailable`, and API response durations. A missing publish event for more than 12 hours needs investigation.

Verify browser search, country selection, refresh, pagination, account switching and playback separately. API resolution alone does not prove that a browser can play a provider's stream.
