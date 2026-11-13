# Media expansion progress

This is the authoritative status ledger for the [podcast and live TV implementation plan](media-expansion-plan.md). Update it in the same working change as implementation and verification evidence.

## Current position

- **Last updated:** 2026-11-13, Asia/Tehran.
- **Current step:** P06 — Podcast catalog ingestion (blocked on external source/directory inputs).
- **Current state:** P06a curated-feed implementation and disposable verification complete. Stable show/feed/episode/enclosure persistence, atomic RSS updates, feed aliases, scheduling and scoped worker access are implemented. Only radio is registered in the application.
- **Last completed step:** P05; P06a is a completed child increment, not completion of parent P06. See [P06 evidence](media-expansion/evidence/P06.md).
- **Active owner:** None. Codex `/root` completed the authorized fixture increment at base `bea4190328073bde42d205f59417b637ab6429da`; no commit created.
- **Next action:** Resolve P06b directory selection/access and P06c approved source records, then implement the selected directory adapter and record real-feed checks. P07 remains pending.
- **Known release dependencies:** User authorized curated-feed fixtures on 2026-11-13, with sources pending. No approved podcast/TV/guide lineup or directory; physical devices/regions and authorized staging remain unestablished. Existing server only, $0 new spending; upgrades unbudgeted. See B01–B05 in the decisions record.

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
| P06 | Podcast ingestion | P03, P05 | blocked | — | P06a done; P06b/P06c pending external inputs. [Evidence](media-expansion/evidence/P06.md). |
| P06a | Curated-feed catalog and fixtures | P03, P05 | done | Codex `/root` | Fresh/upgrade/retry migrations and 456 distinct tests pass across separate runs; [evidence](media-expansion/evidence/P06.md). |
| P06b | Selected directory adapter | P06a | blocked | — | User left source/provider selection pending; need selected directory, current terms/access and any server credentials. |
| P06c | Approved real-feed verification | P06a | blocked | — | Need approved source records and URLs; fixtures cannot satisfy real-provider acceptance. |
| P07 | Podcast discovery | P04, P06 | pending | — | — |
| P08 | Podcast playback and user state | P04, P07 | pending | — | — |
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
| 2026-11-13 | Proceed with curated-feed fixtures; sources and directory remain pending. | User confirmed | P06a completed independently; P06b/P06c and parent P06 remain blocked. |
| 2026-11-13 | Keep one stable source per show, scoped GUID/link episode identities, and explicit feed-URL aliases; reject ambiguous merges. | P06 engineering decision | [Podcast contract](media-expansion/podcasts.md); enclosure changes and rolling-feed omissions preserve references. |

Add new decisions with their owner and rationale. When superseding a decision, label the old row and link its replacement rather than silently rewriting history.

## Agent handoff

- **Last task:** P06 curated-feed implementation under the user's explicit fixture-only direction.
- **Working-tree state:** Prior P00–P05 changes preserved; no commit. P06 adds migration 0022, typed podcast tables, RSS normalization/catalog adapter, scoped role script, worker `--podcasts` option, migration checker, tests and [contract](media-expansion/podcasts.md). Inspect the cumulative dirty tree before further work.
- **Verification:** Node 26.12.1/PostgreSQL 17.11: 450 regression tests passed with database files serialized, plus six podcast DB tests passed separately. All 456 distinct tests covered. Fresh/upgrade/repeated migrations and injected failure/retry preserved existing saved data. Geography/typecheck/build/worker bundle/schema-readiness pass. Initial sandbox listener failures and parallel DB timeouts are documented in [evidence](media-expansion/evidence/P06.md).
- **Runtime:** Temporary Node `/tmp/node-v26.12.1-linux-x64`, PostgreSQL binaries `/tmp/blomoon-pg17` and disposable cluster `/tmp/blomoon-p06-cluster` were prepared for this turn. The test cluster is stopped after verification. These paths may disappear on environment reset; do not assume availability.
- **Next smallest useful task:** Resolve the selected directory/access and approved publisher feed records, implement P06b, then run P06c. Do not mark P06 done or P07 ready from fixtures alone.
- **Migration/rollback:** Apply 0022 after 0020/0021. Existing P05 role installations apply only the new podcast role script; new installations apply base then podcast role scripts once. Stop podcast workers on rollback; retain additive tables. Use `--podcasts` and its scoped DB role, not a competing generic worker.
- **Pending external input:** Directory choice/access/terms and approved source URLs/provenance. User explicitly left these pending. Physical devices, regional coverage, staging and recovery resources remain later release gates.
- **Scope:** No source approval, real publisher fetch, provisioning, deployment, publication or purchases performed.

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
