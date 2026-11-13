# Podcast and live TV implementation plan

Build podcast and live TV modes on Blomoon's existing Next.js application, PostgreSQL database, media plugins, and administration system. Separate interactive requests from ingestion workers and media delivery. Preserve radio and user data throughout the migration.

**Current step, ownership, blockers, and evidence:** [Media expansion progress](media-expansion-progress.md). That file is the only authoritative status ledger. This plan defines the work and completion criteria.

## Working assumptions

- The initial product aggregates public podcast feeds and a curated set of TV sources whose permitted use has been established.
- Browsers receive media directly from publisher CDNs or approved embedded players. The application does not relay arbitrary audio/video URLs.
- The planning workload is 5,000 simultaneous users with a 10,000-user burst scenario. These are test targets, not demonstrated capacity or a production guarantee. Define the actual media mix, request rates, devices, regions, and burst duration in P01.
- Retain a modular application and independently deployed workers. Start with durable PostgreSQL jobs and PostgreSQL search; add shared caching and coordination as justified by the workload.
- The production destination is redundant application instances, a recoverable database with failover, isolated workers, suitable media delivery, and external monitoring. Exact providers remain to be selected.
- Creator uploads, premium subscriptions, paid-channel DRM, our own broadcast pipeline, DVR/catch-up, offline downloads, casting, and native smart-TV apps are optional extensions. Do not silently include them in the core release.
- P01 may revise these assumptions with recorded reasons. An unresolved source agreement blocks that source's release, not work on deterministic fixtures or unrelated modes.

## How an agent executes a step

1. Read the progress ledger, this plan, applicable repository instructions, and the referenced implementation. Inspect the working tree and preserve unrelated changes.
2. Select the user-requested step, or the earliest `ready` step when asked to continue the roadmap. Confirm prerequisites using evidence, not only status labels. Do not claim a step owned by another active agent.
3. Set the selected row to `in_progress`, record an owner identifier and revision, and update the current-step/handoff fields. Keep one primary current step unless explicitly coordinating concurrent work.
4. Implement a reviewable increment with focused checks. Split oversized steps into stable child IDs in the ledger if needed; the parent is complete only when every required child is complete.
5. Record changed paths, exact verification commands and results, evidence links, remaining limitations, and rollback implications. Use repository-relative links within these documents.
6. Mark `done` only after every acceptance criterion is evidenced. A mock or synthetic fixture cannot satisfy a real-provider or physical-device criterion. Keep a partially verified step `in_progress` or `blocked` with the precise missing condition.
7. Recompute ready steps from their prerequisites. Update the current step, next action, decisions, and handoff before ending work. Record the date in the project's user-facing timezone, Asia/Tehran.

No step requires creating a commit or deploying merely to update status. Record a commit when available, otherwise record the base revision and changed paths. Do not store credentials, signed media URLs, user history, or sensitive account data in evidence.

## Architecture boundaries

| Boundary | Responsibility |
| --- | --- |
| Web application | Discovery, account state, search, favourites, playback authorization, and administration. |
| Mode adapters | Radio, podcast, and TV domain behavior behind explicit contracts. Avoid provider DTOs in shared UI. |
| Playback coordinator | One active media session, cancellation, cleanup, capability-based controls, and diagnostics. |
| Playback engines | Direct audio, native/adaptive HLS video, and explicitly supported embedded playback. |
| PostgreSQL | Canonical catalog, source identities, user state, policy, audit events, and durable work. |
| Workers | Feed ingestion, metadata normalization, programme guides, source probes, and scheduled jobs. |
| Shared coordination | Cross-instance rate limits, selected caches, deduplication, and invalidation where needed. |
| Media delivery | Publisher or authorized media CDN; separate from the application request path. |
| Operations | Application and playback measurements, alerts, backups, recovery, and cost controls. |

## Repository starting points

| Area | Read first |
| --- | --- |
| Mode contracts and registration | `src/lib/modes/types.ts`, `src/lib/modes/registry.ts` |
| Current playback | `src/lib/modes/useAudioPlayback.ts`, `src/lib/modes/audioStartup.ts`, `src/lib/modes/audioResolution.ts` |
| Shared persistence | `src/db/schema.ts`, `src/lib/persistence/`, `src/lib/playback-history/` |
| Worker leases and administration jobs | `src/lib/modes/radio/health/queue.ts`, `src/lib/admin/jobs.ts` |
| Existing source validation | `src/lib/modes/radio/health/probe.ts`, `docs/radio-availability.md` |
| Mode administration | `src/lib/admin/mode-contract.ts`, `src/lib/admin/registry.ts`, `docs/omnisire.md` |
| Runtime and deployment | `src/db/index.ts`, `compose.prod.yml`, `scripts/deploy.mjs`, `.github/workflows/deploy.yml`, `README.md` |

Re-read these files when executing: paths and behavior may change after this plan is created.

## Ordered implementation steps

### P00 Establish the roadmap

**Prerequisites:** None.

- Add this plan, a status/evidence ledger, agent discovery guidance, and a README link.
- Record the initial state honestly: feature implementation has not started.

**Acceptance:** Documents link correctly; P01 is identified as the next step; optional scope is distinguishable from the core release.

### P01 Specify product scope and measurable release targets

**Prerequisites:** P00.

- Create a decision record at `docs/media-expansion/decisions.md` covering target audience/regions, media mix, podcast catalog size, initial TV lineup size, source acquisition, and supported browsers/devices.
- Choose a first-release delivery model per source. Record permission/provenance, territories, attribution, expiry, and whether embedding, direct playback, redistribution, recording, or downloads are permitted. Keep agreements and private details outside the repository; record redacted references.
- Define acceptance targets for API latency/error rate, playback startup/success/rebuffering, catalog freshness, EPG coverage, recovery point/time, and operating cost. Separate owned-system targets from publisher-dependent playback targets.
- Define the 5,000-user steady-state and 10,000-user burst profiles: duration, active player mix, interactions, geography, and expected background work. Include the existing availability/application-access polling traffic.
- Record unknowns and recommended defaults. Resolve choices from authorized context where possible; seek only genuinely missing product or commercial decisions. Technical fixture work can continue while source access is pending.

**Acceptance:** Each release metric has a threshold, measurement method, environment, and accountable owner. The supported-source list or explicit release blockers are recorded. Optional features are explicitly excluded or assigned separate scope.

### P02 Establish regression and media test fixtures

**Prerequisites:** P01.

- Run and record the existing release checks; distinguish pre-existing failures from new failures.
- Add controlled fixtures for RSS, byte-range audio, HLS master/media playlists, progressing segments, redirects, invalid responses, expiry, and programme guides as their tests need them.
- Capture radio regression scenarios: discovery, search, saved folders, sharing, playback cancellation/resume, blocks, session revocation, and mode switching.
- Define a reusable browser/device matrix and evidence format. Fixtures must not depend on an unreliable public stream.

**Acceptance:** Baseline results are recorded, deterministic fixtures are available, and representative failure cases can be reproduced without contacting external publishers. Existing data behavior has explicit regression coverage.

### P03 Separate discovery identities from playable items

**Prerequisites:** P02.

- Design and implement shared identity contracts for stations, shows, episodes, and channels. Keep show follows, episode saves, and playable history semantically distinct.
- Define how domain records relate to existing `media_items`, provider identities, folders, history, and shared links. Retain durable internal IDs and alias support.
- Support unknown geography without invented coordinates. Update database constraints, DTO validation, globe filtering, list rendering, and sharing together. Define how verified show/channel locations map to globe markers.
- Use additive migrations and staged backfills. Preserve existing station identities and saved references; document compatibility with the previous application revision.

**Acceptance:** Fresh and upgrade migrations pass on disposable PostgreSQL matching production's supported major version. Existing radio records and saved data survive. Unknown-location items are discoverable without appearing as false globe markers. Cross-mode identity collisions are tested.

### P04 Introduce a capability-based playback coordinator

**Prerequisites:** P03.

- Replace audio-only shared assumptions with typed playback descriptors: media kind, transport, live/on-demand behavior, seekability, source expiry, and supported controls. Keep sensitive provider credentials server-side.
- Separate the active-session coordinator from audio/video engines. Keep radio using its existing behavior through an adapter.
- Define cancellation, resource cleanup, source replacement, error taxonomy, and cross-mode transitions. Pause, resume, stop, and seek have explicit semantics.
- Establish the lifecycle for diagnostics and playback policy refresh. Do not issue requests on every media time update.

**Acceptance:** Radio regressions pass; switching modes cannot leave overlapping media or stale callbacks; rapid play/pause/switch races are tested; malformed descriptors fail safely. The full TV engine is completed in P11.

### P05 Build durable ingestion and safe fetching primitives

**Prerequisites:** P03.

- Reuse or extend existing PostgreSQL jobs and leases for scheduled feed/guide work. Include idempotency, deduplication, heartbeat/lease expiry, bounded retries, stale-result rejection, and failed-job inspection.
- Add per-host concurrency limits, jitter, conditional requests, timeouts, redirect limits, decompressed byte limits, and cancellation.
- Reuse reviewed network validation where appropriate. Validate destinations and redirects against SSRF, including DNS changes and IPv4/IPv6 private addresses. Isolate workers from infrastructure credentials and internal network services.
- Parse XML with external entity/DTD expansion disabled; bound parser resource use and sanitize imported display HTML.

**Acceptance:** Tests demonstrate crash recovery, duplicate-job safety, stale-worker rejection, hostile/oversized inputs, private-address rejection, and bounded resource use. Workers cannot become an arbitrary URL proxy. Publisher outages do not erase the last good catalog.

### P06 Implement podcast catalog ingestion

**Prerequisites:** P03, P05.

- Add typed show, feed/alias, episode, and enclosure persistence with necessary indexes. Decide which information is canonical versus provider-specific.
- Add a curated-feed adapter and the selected directory adapter. Keep provider secrets server-side and honor source attribution/usage constraints.
- Handle stable GUIDs, feed redirects/migrations, changed enclosures, duplicates, corrections, explicit flags, and missing metadata. Do not delete historical episodes solely because a rolling feed omits them.
- Schedule feeds based on activity and failures; expose freshness and ingestion outcomes.

**Acceptance:** Repeated ingestion is idempotent; feed migration preserves show/episode references; changed URLs do not reset user state; malformed feeds preserve last-known-good data. Real approved feed checks are recorded separately from fixtures.

### P07 Add podcast discovery and show pages

**Prerequisites:** P04, P06.

- Register the podcast mode and implement paginated catalog/search/detail APIs, show pages, and episode lists.
- Support language, topic, and text discovery alongside geographic discovery. Define Persian/Arabic normalization and sorting requirements from the P01 audience.
- Bound globe marker counts and query costs. Add indexes based on query plans; avoid loading all episodes into the browser.
- Keep unavailable/saved items understandable and preserve share links across source updates.

**Acceptance:** Empty, loading, stale, failed, and unavailable states work; pagination has no obvious duplicates/skips under the chosen consistency model; unknown geography is supported; access controls and query plans are verified.

### P08 Add podcast playback and personal listening state

**Prerequisites:** P04, P07.

- Implement seeking, playback speed, skip controls, sleep timer, episode queue, and next-episode behavior using supported browser capabilities.
- Add follows, episode saves, progress, completion, and resume APIs with ownership enforcement.
- Save progress at a bounded interval and on meaningful lifecycle events. Use idempotent session/version handling so delayed updates cannot overwrite newer state. Handle legitimate rewinds; do not use maximum position as a universal conflict rule.
- Integrate supported media-session controls and disclose background/offline limitations accurately. Preserve publisher enclosure/ad behavior.

**Acceptance:** Seeking and resume work with byte-range fixtures and approved real sources; two-device conflicts and out-of-order requests are tested; one user's state is inaccessible to another. Device tests cover lock/unlock, interruption, and network changes. Downloads remain out of scope.

### P09 Complete podcast administration and release gate

**Prerequisites:** P05, P08.

- Register podcast admin adapters/editors. Provide feed inspection, refresh, alias/duplicate correction, explicit flags, source freshness, and audited block/unblock controls.
- Preserve curated overrides through provider refreshes. Blocking removes new discovery/playback eligibility without destroying saved references.
- Add integration and browser coverage for the complete ingest → discover → play → save → resume → administer flow.
- Package the mode behind the existing mode controls and define rollback/disable behavior.

**Acceptance:** End-to-end and device evidence meets the P01 podcast criteria, or the precise outstanding gate remains recorded. Disabling podcasts preserves radio and user state. Podcast readiness is distinct from final production rollout in P17.

### P10 Implement the curated TV catalog and source policy

**Prerequisites:** P03, P05, P09 for the default podcast-first sequence.

- Add channels, source variants, territory/policy metadata, source expiry, and health observations. Use stable broadcaster/channel identities and explicit variants rather than merging by name alone.
- Implement curated ingestion and paginated discovery/search/detail APIs with provenance and permitted delivery methods.
- Resolve playback by channel/source identity, not arbitrary client-supplied URLs. Enforce mode/channel blocks, source policy, and eligibility server-side.
- Represent unknown/unverified/unsupported availability honestly. Publish only the approved initial source set.

**Acceptance:** Source updates preserve favourites; disallowed/expired sources cannot obtain new authorization; credentials and signed URLs do not leak into catalog responses or logs. Fixture-backed development remains possible when real source access is blocked.

### P11 Implement adaptive live TV playback

**Prerequisites:** P04, P10.

- Select and pin a maintained player after checking current support and licensing. Implement native HLS and the required JavaScript adaptive playback path; add other transports only for approved source requirements.
- Add a video surface, live indicator, live-edge recovery, quality selection, captions/audio tracks where available, fullscreen, and supported picture-in-picture behavior.
- Test all required manifests, segments, keys, and tracks for HTTPS/CORS behavior. Handle source expiry, renewal, retry limits, and switching without loops.
- Enforce a single active media session and correct cleanup. Do not imply DVR/seek support when the source lacks a supported window.

**Acceptance:** Real supported browsers play approved sources; deterministic tests cover stalled manifests, segment failure, unsupported codecs, expiry, and source switching. User-visible failures identify actionable categories. Record device/region limitations.

### P12 Add programme guides

**Prerequisites:** P05, P10.

- Add programme persistence and guide-provider ingestion with stable channel mapping and source attribution.
- Store normalized UTC timestamps while retaining timezone/provenance information; handle DST, corrections, gaps, overlaps, and retention.
- Display now/next and a bounded schedule with freshness indicators. A guide entry does not imply playback/recording rights or catch-up availability.

**Acceptance:** Timezone and boundary cases are tested; stale/missing guides do not prevent live playback; updates do not create duplicated programmes. Verify real guide coverage against P01, or document an explicit scope change before deferring this step.

### P13 Complete TV health checks and administration

**Prerequisites:** P11, P12.

- Add TV admin adapters/editors for channel/source curation, policy, guide mapping, audited blocks, and rechecks.
- Extend source checking beyond HTTP success: validate playlist progression and sample actual media under bounded budgets. Add selected synthetic browser probes to detect failures that transport checks miss.
- Store check region, method, freshness, and reason. Separate worker connectivity incidents from publisher failures and regional restrictions.
- Reuse lease safety and per-host limits; avoid downloading every full stream continuously. Keep source costs observable.

**Acceptance:** A frozen or misleading manifest is not classified as healthy solely on HTTP status. A regional failure is not automatically treated as a global failure. Source checks, administrator actions, and disable/rollback behavior are verified end-to-end.

### P14 Make application scaling and playback quality observable

**Prerequisites:** P09, P13.

- Add bounded, sampled playback events for startup, buffering, fatal errors, source changes, and completion. Avoid raw signed URLs and unnecessary user identifiers.
- Build dashboards/alerts for API latency/errors, database saturation, job lag, catalog freshness, playback outcomes by source/device/region, and delivery costs where available.
- Audit the existing 15-second item/access polling. Consolidate or reduce redundant work with jitter/backoff while maintaining the documented revocation policy. Direct third-party URLs cannot be reliably revoked after disclosure.
- Add shared cache/rate-limit coordination where required; test invalidation and personalized-response isolation. Control cache stampedes, replica connection budgets, and metrics cardinality.
- Define privacy retention/deletion for progress and telemetry and implement the applicable data paths.

**Acceptance:** Fault injection produces useful alerts; request/event rates match the P01 budget; no per-frame database writes occur; dashboards distinguish application failures from publisher failures; sensitive responses cannot be shared across users.

### P15 Prepare redundant infrastructure and staging

**Prerequisites:** P14.

- Select providers using documented regional reachability, account/billing eligibility, supported media use, cost, and operating requirements. Verify current provider documentation before implementation.
- Define reproducible deployment/configuration for multiple app instances across failure domains, separate workers, database failover/pooling, and any shared coordination service.
- Coordinate Next.js caches, builds, secrets, and invalidation across replicas. Use backward-compatible schema changes, readiness checks, graceful shutdown, and rollback procedures.
- Configure encrypted off-server backups, point-in-time recovery where selected, external uptime monitoring, secret rotation, and least-privilege network access.
- Prepare the deployment configuration and runbooks before any external provisioning. Provision or deploy only within the user's actual authorization; otherwise record the precise external action pending and complete independent work.

**Acceptance:** Configuration is validated, topology has no accidental single-host dependency for the agreed availability target, and staging is running or its exact external blocker is recorded. No secrets are committed. P16 cannot be marked complete without the required running environment.

### P16 Prove capacity, failure recovery, and costs

**Prerequisites:** P15.

- Implement and run the P01 steady/burst workload profiles against authorized staging using controlled media delivery. Do not load-test publishers without permission.
- Include discovery/search, sign-in/session checks, playback resolution, progress updates, cache misses, worker traffic, and popular-channel bursts. Report application load separately from media delivery load.
- Exercise application loss, worker death, database failover, coordination-store failure, provider outages, token expiry, and deployment during playback.
- Restore backups into a separate database and measure recovery point/time. Rehearse rollback without destructive migration reversal.
- Run the physical-device/region matrix with approved real content at normal volume. Estimate monthly costs from measured viewer-hours, bitrate, channel operating hours, and provider quotes.

**Acceptance:** A reproducible report records revision, environment, dataset, concurrency, request rate, durations, percentiles, errors, bottlenecks, recovery measurements, and cost assumptions. Every P01 release threshold passes or the step remains incomplete. A fixture test alone does not establish global publisher playback reliability.

### P17 Roll out and close the core release

**Prerequisites:** P16.

- Prepare a release checklist with source permissions, migration/backfill sequence, exact revisions, dashboards, alert ownership, support procedure, and rollback triggers.
- Roll out to a limited cohort first, then expand according to the P01 observation window and measured thresholds. Apply migrations before enabling modes, using the rehearsed compatible deployment sequence.
- Confirm scheduled jobs, backups, source freshness, costs, playback quality, and existing radio behavior in the authorized production environment.
- Update README and operating documentation to describe actual behavior. Keep unresolved device/source limitations visible.

**Acceptance:** Authorized production rollout and its observation window are complete; release criteria are evidenced; recovery/disable procedures are usable; operational ownership is recorded. Code merged or a staging demonstration alone does not complete this step.

## Optional work after the core release

These items remain `deferred` until explicitly scoped. They do not block P17 and must not be counted as implemented features.

| ID | Extension | Additional work and entry criteria |
| --- | --- | --- |
| O01 | Authorized Blomoon media distribution | Content agreements, ingest redundancy, rendition ladder, packaging, origin protection, media CDN, delivery budgets, and broadcaster failover drills. Reuse existing compatible feeds without unnecessary re-encoding. |
| O02 | Premium channels and subscriptions | Product/billing specification, entitlements, signed delivery, DRM/license service, supported-device matrix, concurrency limits, refunds, and account-sharing policy. |
| O03 | DVR and catch-up | Explicit recording/replay rights, retention/storage budgets, accurate time windows, programme-to-recording mapping, and expiry enforcement. |
| O04 | Offline podcasts and device integrations | Download rights, quotas/eviction, resumable downloads, offline progress conflicts, casting/native-platform behavior, and separate device testing. |
| O05 | Creator uploads | Publisher identity, upload security, moderation, transcoding, storage lifecycle, publishing/RSS generation, quotas, and abuse response. |

## Verification rules

- Before a release, run `npm run geo:check`, `npm run typecheck`, `npm test`, and `npm run build`, as specified in README. During a step, use focused meaningful checks and broaden when the changed surface warrants it.
- Migration and database integration tests must use explicitly disposable databases. Use current documented opt-in flags; never invent or silently point test commands at production.
- Cover both a fresh schema and an upgrade containing representative existing accounts, stations, favourites, and history. Test migration restart/repetition and application rollback compatibility.
- Use the repository's supported Node version and a database matching the deployment major version. Record deviations and their impact rather than claiming identical validation.
- Keep implementation checks, browser fixtures, physical-device checks, real-provider checks, load tests, and production observations distinguishable in evidence.
- Proposed evidence location: `docs/media-expansion/evidence/<step-id>.md`. Create files only when there is substantive evidence. Link large artifacts from an approved durable location and redact sensitive information.

## Reference material

Verify current documentation again when selecting or upgrading integrations. These references informed the initial design on 2026-11-10.

- [Podcast RSS requirements](https://podcasters.apple.com/support/823-podcast-requirements)
- [Podcast Index API](https://github.com/Podcastindex-org/docs-api) and [terms](https://github.com/Podcastindex-org/terms-of-service)
- [Apple HLS](https://developer.apple.com/streaming/) and [hls.js](https://github.com/video-dev/hls.js)
- [Shaka DRM configuration](https://shaka-project.github.io/shaka-player/docs/api/tutorial-drm-config.html)
- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [AWS media delivery architecture](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/live-streaming.html)
- [Cloudflare application service terms](https://www.cloudflare.com/service-specific-terms-application-services/)
