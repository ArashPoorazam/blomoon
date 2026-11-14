# Media expansion progress

This is the authoritative status ledger for the [podcast and live TV implementation plan](media-expansion-plan.md). Update it in the same working change as implementation and verification evidence.

## Current position

- **Last updated:** 2026-11-14, Asia/Tehran.
- **Current step:** P08 — Podcast playback and user state (in progress).
- **Current state:** P08 implementation and automated verification complete: episode playback, controls/queue/sleep timer, follows/saves and conflict-safe listening progress. Full P08 acceptance remains open for approved-source/device evidence.
- **Last completed step:** P07; [acceptance evidence](media-expansion/evidence/P07.md).
- **Active owner:** Codex `/root`, P08 at base `c5046aa`; implementation handed off for device verification.
- **Next action:** Run the [P08 device checklist](media-expansion/P08-device-checklist.md), complete approved-source/browser evidence, then close P08 before P09.
- **Known release dependencies:** Physical devices, supported sources/regions, staging/load/recovery remain pending. Existing server only, $0 new spending; no deployment or production seeding.

## Status meanings

| Status | Meaning |
| --- | --- |
| `pending` | Required work whose prerequisites have not yet been completed. |
| `ready` | Prerequisites are met; no agent has claimed the step. |
| `in_progress` | An identified agent is actively implementing or verifying the step. |
| `blocked` | A named missing dependency prevents the next required work; record what would unblock it. |
| `done` | All acceptance criteria have linked evidence, including external/device checks when required. |
| `deferred` | Optional scope not included in the core release. |

Do not infer completion from the existence of files, a passing unit suite, or a previous agent's summary. Reconcile the code, evidence, and criteria. Never replace another active owner's work without coordination.

## Step ledger

| Step | Work | Prerequisites | Status | Owner | Evidence or blocker |
| --- | --- | --- | --- | --- | --- |
| P00 | Establish the roadmap | None | done | Initial planning agent | See P00 completion record below. |
| P01 | Scope and release targets | P00 | done | Codex `/root` | [Decisions and targets](media-expansion/decisions.md); [acceptance evidence](media-expansion/evidence/P01.md). Release blockers are explicit, not cleared. |
| P02 | Regression baseline and fixtures | P01 | done | Codex `/root` | [Acceptance evidence](media-expansion/evidence/P02.md); [regression/device matrix](media-expansion/test-matrix.md). Node deviation and skipped DB/device checks explicit. |
| P03 | Discovery and playable identities | P02 | done | Codex `/root` | [P03 evidence](media-expansion/evidence/P03.md); fresh/upgrade/retry on PostgreSQL 17.11; 343 tests pass, none skipped. |
| P04 | Playback coordinator | P03 | done | Codex `/root` | [P04 evidence](media-expansion/evidence/P04.md); 375 tests pass with all DB opt-ins; geography/typecheck/build pass on Node 26.12.1. |
| P05 | Durable ingestion and safe fetching | P03 | done | Codex `/root` | [P05 evidence](media-expansion/evidence/P05.md); fresh/upgrade/retry PG17 migrations, 444 tests, typecheck/geography/build pass. |
| P06 | Podcast ingestion | P03, P05 | done | Codex `/root` | All child increments complete; [final evidence](media-expansion/evidence/P06.md). |
| P06a | Curated-feed catalog and fixtures | P03, P05 | done | Codex `/root` | Fresh/upgrade/retry and saved-data preservation; [evidence](media-expansion/evidence/P06.md). |
| P06b | Selected directory adapter | P06a | done | Codex `/root` | Free keyless Podcast Index search/lookup and verified stable aliases; [source/access records](media-expansion/podcast-sources.md). |
| P06c | Approved real-feed verification | P06a | done | Codex `/root` | HPR 10 episodes and LINUX Unplugged 692 episodes, two successful ingestions each; distinct real-provider evidence and connectivity limitations recorded. |
| P07 | Podcast discovery | P04, P06 | done | Codex `/root` | [P07 evidence](media-expansion/evidence/P07.md); 475 distinct tests, Node 26/PG17 query plans, geography/typecheck/build pass. |
| P08 | Podcast playback and user state | P04, P07 | in_progress | Codex `/root` | [Implementation/evidence](media-expansion/evidence/P08.md): 489 distinct tests; PostgreSQL fresh/upgrade/retry; Chromium byte-range audio. Physical-device and approved-source matrix pending. |
| P09 | Podcast administration and release gate | P05, P08 | pending | — | — |
| P10 | TV catalog and source policy | P03, P05, P09 | pending | — | — |
| P11 | Adaptive TV playback | P04, P10 | pending | — | — |
| P12 | Programme guides | P05, P10 | pending | — | — |
| P13 | TV health and administration | P11, P12 | pending | — | — |
| P14 | Scaling and playback observability | P09, P13 | pending | — | — |
| P15 | Redundant infrastructure and staging | P14 | pending | — | — |
| P16 | Capacity and recovery proof | P15 | pending | — | — |
| P17 | Production rollout | P16 | pending | — | — |
| O01 | Blomoon media distribution | Separate scope | deferred | — | Not required for the core release. |
| O02 | Premium channels/subscriptions | Separate scope | deferred | — | Not required for the core release. |
| O03 | DVR/catch-up | Separate scope | deferred | — | Not required for the core release. |
| O04 | Offline/device integrations | Separate scope | deferred | — | Not required for the core release. |
| O05 | Creator uploads | Separate scope | deferred | — | Not required for the core release. |

The default sequence is podcast-first. Dependencies permit some independent work, but this ledger does not instruct agents to spawn other agents. Follow the user's task scope and applicable execution instructions.

## P00 completion record

- **Date:** 2026-11-10.
- **Delivered:** [Implementation plan](media-expansion-plan.md), this ledger, [agent guidance](../AGENTS.md), and [README entry point](../README.md).
- **Verification:** Documentation paths, prerequisite/status consistency, and whitespace checked locally. No application behavior changed; application tests are not required for this documentation-only step.
- **Implementation baseline:** Only radio is registered. Playback is audio-only, history lacks episode progress, and shared media records require location. Production configuration describes a single-host Compose deployment. Revalidate these observations before implementation.
- **Release evidence:** None yet. No live-provider, capacity, staging, recovery, or production verification is implied by completing P00.

## Decisions

| Date | Decision | State | Reason or reference |
| --- | --- | --- | --- |
| 2026-11-10 | Keep Next.js/PostgreSQL and extend media modes with separate workers. | Planning default | Existing application boundaries support incremental delivery. Validate in P01. |
| 2026-11-10 | Start with direct publisher delivery and curated TV. | Planning default | Avoid operating a media distribution pipeline before source requirements justify it. Validate in P01. |
| 2026-11-10 | Use 5,000 steady concurrent users and a 10,000-user burst for planning. | Unvalidated target | P01 must specify workload/thresholds; P16 must measure capacity. |
| 2026-11-10 | Keep optional extensions outside the core release. | Scope default | Explicitly scope them before implementation. |
| 2026-11-12 | Global audience, no primary language or region. | User confirmed | D01 in [P01 decisions](media-expansion/decisions.md); device/region targets do not imply universal source eligibility. |
| 2026-11-12 | Existing server only; upgrades unbudgeted; no paid content licences or add-on services. | User confirmed | D02 supersedes the user's earlier ambiguous zero-budget answer. Existing server cost remains separate; new-spend ceiling is $0. |
| 2026-11-12 | Retain direct publisher/approved-embed delivery and podcast-first sequence; published free terms may establish source permission. | P01 engineering policy | D03/D05; no actual lineup approved. See source records and B01/B02/B05. |
| 2026-11-12 | Define 100 shows / 20,000 episodes / 10 TV channels and explicit 5,000/10,000-user profiles and release metrics. | Engineering defaults, unmeasured | D04/D06 and M01–M14; refines the 2026-11-10 unvalidated workload target without claiming capacity. |
| 2026-11-12 | Preserve redundancy/recovery requirements despite the existing-server budget. | Release gate retained | D07/B03; no new provisioning authorized or feasibility demonstrated. |
| 2026-11-12 | Keep radio's existing resolver wire format behind a strict descriptor adapter; represent unsupported video/embed engines without registering those modes. | P04 engineering decision | [Playback contract](media-expansion/playback.md); preserves saved aliases, scopes full TV to P11, and keeps source credentials out of diagnostics. |
| 2026-11-13 | Separate publisher fetching/parsing from the credentialed DB coordinator; publish under lease/revision checks in one transaction. | P05 engineering decision | [Ingestion contract](media-expansion/ingestion.md); source approval stays privileged and production network isolation remains P15. |
| 2026-11-13 | Proceed with curated-feed fixtures; sources and directory remain pending. | Superseded by later user approval below | Original P06a scope; retained as decision history. |
| 2026-11-13 | Keep one stable source per show, scoped GUID/link episode identities, and explicit feed-URL aliases; reject ambiguous merges. | P06 engineering decision | [Podcast contract](media-expansion/podcasts.md); enclosure changes and rolling-feed omissions preserve references. |
| 2026-11-13 | Approve Podcast Index, Hacker Public Radio and LINUX Unplugged; complete P06 without new costs. | User confirmed | Supersedes fixture-only scope. [Source records](media-expansion/podcast-sources.md); no deployment authorized. |
| 2026-11-13 | Use keyless directory compatibility endpoints, verified feed aliases and one source-specific larger RSS profile. | P06 engineering decision | Real-feed evidence required the 12 MiB LINUX Unplugged profile; other source limits unchanged. DNS fallback preserves whole-set public-address validation and TLS. |
| 2026-11-13 | Expose only approved local podcast catalog; use revision-checked pagination and normalized C-collation title order. | P07 engineering decision | [Discovery contract](media-expansion/podcasts.md); bounded pages/markers, no public directory proxy, local query-plan evidence. |

Add new decisions with their owner and rationale. When superseding a decision, label the old row and link its replacement rather than silently rewriting history.

## Agent handoff

- **Last task:** Implemented P08 playback and personal state; user requested commit/push and agreed to run physical-device checks. [Evidence](media-expansion/evidence/P08.md), [contract](media-expansion/podcast-listening.md), [checklist](media-expansion/P08-device-checklist.md).
- **Working tree/revision:** Base `c5046aa`; P08 changes on `codex/podcast-discovery-review`. See Git log for resulting commit.
- **Verification:** Node 26.12.1/PostgreSQL 17.11; 489 distinct tests pass. Fresh/upgrade/interrupted/repeated migration preservation, geography/typecheck/build, and actual Chromium native byte-range playback pass. No physical-device or production evidence implied.
- **Runtime:** `/tmp/node-v26.12.1-linux-x64`, `/tmp/blomoon-pg17`, disposable `/tmp/blomoon-p08-cluster` on 55446. Temporary paths can disappear.
- **Decision:** Listening acquisition uses observed-version CAS; progress uses session UUID and increasing sequence. Rewinds are allowed. Queue is explicit, tab-local and capped at 100; completion advances only queued episodes. Writes every 15 seconds while playing plus lifecycle events; failures are visible.
- **Migration/rollback:** Apply additive 0023 before application update; preserve all tables/data on disable or rollback. No ingestion-role personal-state grants. No production changes or main-branch push.
- **Next task:** Execute approved-source and physical-device checklist and attach evidence. Keep P08 in_progress and P09 pending until all acceptance criteria pass.

## Completion and blocker record template

Copy this template into the step's evidence file or replace the relevant handoff fields. Do not fill it with hypothetical results.

```text
Step ID:
Status / owner / date:
Base revision and resulting revision, if committed:
Changed paths:
Acceptance criteria satisfied:
Commands/checks performed and actual results:
Evidence links and environment/device details:
Unverified criteria or exact blocker:
External action/input needed, if any:
Migration, rollout, and rollback implications:
Next action:
```

## Prompt for continuing the work

```text
Continue Blomoon's podcast/live TV roadmap. Read AGENTS.md,
docs/media-expansion-plan.md, and docs/media-expansion-progress.md.
Reconcile the tracker with the current working tree. Implement the earliest ready
step within the requested scope, verify its acceptance criteria, and update the
step ledger, evidence, current position, and handoff. Preserve radio behavior and
user data. Report missing external inputs precisely; do not invent verification
or provision/deploy outside the authorization in this chat.
```
