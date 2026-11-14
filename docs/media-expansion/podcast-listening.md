# Podcast listening (P08)

Apply additive migration `0023_podcast_listening` before running this revision. The application database owner accesses the new RLS-enabled tables; ingestion workers receive no personal-state grants. Retain the tables on rollback. Existing radio favourites, folders, history and account rows are untouched.

Shows remain discovery-only. Their pages offer follows and episode saves; the podcast favourites/history drawers open the dedicated podcast library. Library pages return at most 50 items, ordered by time and UUID. Offset pagination is a live view: refresh after edits on another device. Saved references remain visible after blocking or source removal; playback eligibility is checked independently. Show follows never enter playable history. Recent listening is derived from episode progress, rather than radio's daily starts.

Episode playback uses the shared coordinator and native audio engine. Resolution accepts an episode UUID, validates eligibility (show/episode blocks, source enablement and successful ingestion), and supplies the publisher's active HTTPS audio enclosure after public-address validation. No media bytes pass through the application. Enclosure URLs are absent from discovery/library responses. Browser delivery preserves publisher bytes, redirects and advertisements. Publisher redirects/DNS at playback time are controlled by the browser; server-side validation is not a claim of CDN availability or end-to-end redirect validation. Browser range/codec support determines seeking; unsupported seeks produce an explicit message.

Controls include seek, −15/+30 seconds, 0.5–3× speed, pause/resume/stop, a bounded 100-episode queue and 5/15/30/60-minute sleep timers. Only explicitly queued episodes advance automatically; errors stop advancement. Queue/timer state is local to this tab and clears on mode switching. Standard Media Session controls are installed where supported and removed on mode changes/unmount. Background playback, lock-screen controls and timer punctuality depend on the browser/OS. No offline storage or download feature is introduced.

## Progress and ownership

All personal routes live under `/api/modes/podcasts/`, require a verified authenticated account and inherit maintenance/mode restrictions. The account ID always comes from the server session. Input objects reject extra fields, including forged owners. Identity endpoints and progress values are bounded.

- `GET episodes/<id>/listening`: obtain the current version and position.
- `POST episodes/<id>/listening`: acquire using a fresh client session UUID and `expectedVersion`. Row locking serializes competing devices; only one acquisition of a version succeeds. Retrying the current session is idempotent; a delayed older acquisition fails with 409.
- `PUT episodes/<id>/listening`: submit the session UUID, increasing sequence, position and completion. Older/duplicate sequences cannot overwrite newer state. Rewinds are accepted as lower positions with newer sequences. A superseded session receives 409.
- `GET/PUT library`: list or change follows/saves; `kind=recent` lists listening history. Completed episodes restart at zero when explicitly played again.

The player samples position locally once a second; it saves at most once every 15 seconds while playing, plus pause, end, stop, source replacement, page hiding and unmount. Identical samples are deduplicated. There is no request per media time-update event. Writes use bounded requests and keepalive; delivery on process termination is best effort. A same-tab restart waits for pending writes before reading resume state. Sync failure or takeover is shown in the player and stops further writes for that session; Stop then Play acquires the latest state. Failure to establish a listening session prevents startup and explains how to retry. These semantics do not claim uninterrupted playback or offline reconciliation.

## Verification commands

Use Node 26.12.1 and explicitly disposable PostgreSQL 17 databases. The migration script creates/drops random local databases and verifies fresh, upgraded, interrupted/retried migration paths with existing account, radio, podcast, save, folder and history data.

```sh
P08_DISPOSABLE=1 P08_TEST_DATABASE_URL=postgres://test-user@127.0.0.1:55446/postgres node --import tsx scripts/check-podcast-listening-migration.mts
PODCAST_LISTENING_INTEGRATION=1 DATABASE_URL=postgres://test-user@127.0.0.1:55446/blomoon_p08_suite npm test -- src/lib/modes/podcasts/listening.integration.test.ts
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs CHROMIUM_PATH=/usr/bin/chromium node --import tsx scripts/check-podcast-audio-browser.mts
```

The browser script bundles the production audio engine, uses the controlled byte-range tone and checks metadata restore, backward seek, rate and pause/resume in real Chromium. Its fixture delivery intentionally uses loopback HTTP; it does not relax production descriptor validation and does not establish HTTPS/provider/device acceptance. See [P08 evidence](evidence/P08.md) and the [device checklist](P08-device-checklist.md).
