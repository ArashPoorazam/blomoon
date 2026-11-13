# Media expansion scope and release targets

Decision date: 2026-11-12 (Asia/Tehran). Scope: P01 of the [roadmap](../media-expansion-plan.md). Status and acceptance evidence live in the [progress ledger](../media-expansion-progress.md) and [P01 evidence](evidence/P01.md). These are targets, not measured capacity or release approval.

## Decisions and ownership

| ID | Decision | Authority and rationale |
| --- | --- | --- |
| D01 | Serve a global audience with no primary language or region. | User confirmed in chat on 2026-11-12. A global audience does not imply that every source is licensed or reachable everywhere. |
| D02 | Use the existing server. New monthly spend is $0; upgrades remain unbudgeted. No paid content licences or additional paid services. | User clarified that the budget is for a good server only, then chose to use the existing server with upgrades unbudgeted. This supersedes the earlier ambiguous “zero” answer. Existing server cost is not assumed to be zero. |
| D03 | Preserve radio; implement podcasts before TV; deliver audio/video from the publisher or an approved embedded player. | Roadmap default retained by Codex. Do not proxy, rehost, transcode, or operate a broadcast pipeline. |
| D04 | Size the initial increment for 100 podcast shows, 20,000 retained episode records, and 10 curated TV channels with at most two variants each. | Codex engineering default, not a promised or approved lineup. Keep previously saved episode references when feeds roll over; these are sizing targets, not destructive retention limits. |
| D05 | Start acquisition with a curated allowlist of publisher RSS feeds and official channel sources. Directory integration remains an explicit P06 selection gate. | Updated 2026-11-13: owner approved Podcast Index keyless discovery and HPR/LINUX Unplugged ingestion. See [source records](podcast-sources.md). Other directory entries are not approved automatically. |
| D06 | Keep 5,000 steady users and 10,000 burst users as capacity test targets. | Roadmap default retained. Existing server capacity is unknown; do not claim it meets these targets or silently lower them to fit the budget. |
| D07 | Retain the roadmap's redundant-production and recovery requirements. | A single existing server does not demonstrate redundancy. P15–P17 remain gated if available infrastructure cannot meet the requirements without new spending. |

The Blomoon project owner (the user) is accountable for product scope, source eligibility, cost, and release decisions. For execution, the agent recorded against each step in the progress ledger is accountable for producing its engineering evidence. The project owner is the default operations and release-evidence owner until a named operator accepts a recorded handoff; no staffed on-call service is assumed. Metric owners below refer to these roles, not to an unassigned future team.

## Product and device scope

Core: existing radio discovery, favourites/folders/sharing and history; podcast shows, episodes, follows, saves, seeking, speed, skip, sleep timer, queue, completion and resume; curated live TV, supported captions/audio tracks, quality selection and now/next plus bounded schedules. Use explicit unavailable, stale and unknown states. Location is optional for new entities; language or content origin is not evidence for map coordinates.

Preserve the existing English interface as the initial UI baseline. Catalog names and descriptions retain publisher language and script. Support Unicode search, mixed-direction text, and language filters; include Persian/Arabic letter variants, diacritics, Latin accents, and Unicode normalization in P07 fixtures. Document search folding separately from displayed text and stable pagination tie-breaks. Full interface translation is separately scoped; a global audience does not authorize a translation project.

| Required matrix | Versions to record at test time | Checks |
| --- | --- | --- |
| Windows desktop | Current and previous stable Chrome, Edge, Firefox on a supported Windows release | Discovery, keyboard controls, playback, seek/resume, mode switching, error recovery |
| macOS desktop | Current and previous stable Safari; current Chrome on supported macOS | Same flows; native HLS and supported video controls |
| Android phone | Current Chrome on current and previous supported Android major versions; physical phone | Same flows; install/relaunch, lock/unlock, interruption, Wi-Fi/mobile handover |
| iPhone | Safari on current and previous supported iOS major versions; physical phone | Same flows; install/relaunch, safe areas, interruption, network change, native HLS |

Record exact browser/OS/device versions, never just “latest.” Browser automation is separate from physical-device evidence. Feature-detect fullscreen, picture-in-picture, Media Session and track controls; unavailable optional browser controls must be hidden or explained. No guarantee of uninterrupted background playback. Smart TVs, native apps, casting, downloads/offline media, creator uploads, subscriptions/DRM, recording/DVR/catch-up, and Blomoon media redistribution remain excluded (O01–O05). Existing offline reconnect behavior remains unchanged.

Regional release samples: North America, South America, Europe, Africa, Asia and Oceania; include an Iran network sample without making Iran the primary market. Evidence must name the actual country/network and eligible sources. If a region or device cannot be tested, record that limitation and keep its release gate open; another region's result is not a substitute.

## Source acquisition and permission record

Permission need not mean a separately negotiated or paid agreement. Applicable publisher/platform terms may already permit a specific kind of playback. A public feed, free-to-watch stream, successful HTTP response or directory entry alone is not a release approval. Treat permission for metadata/artwork, direct playback, embedding, and redistribution as separate capabilities. A technical playback pass is not a rights review.

| Source class | First-release delivery | Current eligibility / exact blocker |
| --- | --- | --- |
| Existing radio | Existing Radio Browser/provider delivery and current controls | Preserve behavior; P01 adds no new radio source approvals and makes no retrospective rights certification. |
| Podcast feeds | Browser requests publisher RSS enclosure URL directly, preserving publisher content/ad behavior | HPR and LINUX Unplugged approved for the P06 pilot on 2026-11-13; [permission and attribution records](podcast-sources.md). Broader release lineup remains pending. |
| Podcast directory | Metadata/identity discovery only; never a grant of media rights | Podcast Index selected; documented keyless endpoints verified without accounts/fees. [Terms, bounds and attribution](podcast-sources.md). |
| Direct live TV | Official publisher HTTPS HLS; other transports only if a selected source requires them | No approved channels yet. Need permission for third-party direct playback, territories and expiry; an extracted `.m3u8` is not sufficient. |
| Embedded live TV | Official publisher/platform player, only where terms and embedding settings permit | No approved channels yet. Preserve player controls, branding, ads and restrictions. An embed-only source does not authorize raw-stream extraction. |
| Programme guides | Publisher/guide feed with permitted metadata use | No approved guide provider. Need no-cost rights, stable channel mapping, coverage and refresh limits before P12 real-guide acceptance. |
| Controlled fixtures | Locally generated media and synthetic metadata | Authorized engineering input only; cannot satisfy real-source or regional release gates. |

Before publishing a source, add one record containing: stable source/channel/show ID; public official homepage and feed/player provenance; delivery method; permission status (`pending`, `approved`, `expired`, `withdrawn`); public terms URL plus review date/version or a redacted private agreement reference; permitted and excluded territories; attribution/logo requirements; expiry or explicit no-stated-expiry plus next review date; permitted/prohibited/unknown values for direct playback, embedding, metadata/artwork use, redistribution, recording and downloads; costs/quotas; applicable monetization restrictions; approving owner; technical check evidence and takedown/contact reference. Unknown permission does not become approved by default. Keep private agreements, personal contacts, credentials and signed URLs outside the repository.

Recheck source terms before first release and at least every 90 days thereafter, and immediately upon notices or expiry. Block new discovery/playback authorization when approval expires or is withdrawn; preserve saved IDs. The application cannot recall an already disclosed third-party URL. Do not circumvent territory restrictions. Source approval can be based on published free terms; paid licences are excluded under D02.

Examples checked on 2026-11-12, for interpreting the policy only (none is an approved Blomoon source):

- [This American Life's app terms](https://www.thisamericanlife.org/terms-of-use-for-apps) allow applications under conditions, require original RSS file delivery, restrict advertising/marketing, and reserve removal rights. This illustrates that existing terms can supply permission without a custom agreement.
- [YouTube's terms](https://www.youtube.com/static?template=terms) permit its embeddable player. That permission is not authorization to extract media into a different player.
- [Podcast Index's published API terms](https://github.com/Podcastindex-org/legal/blob/main/TermsOfService.md) require compliance with third-party rights and access limits. Directory access does not establish a source's eligibility.
- The [U.S. Copyright Office's discussion of Internet retransmission](https://www.copyright.gov/docs/regstat61500.html) explains the rights implicated in retransmitting television. This is U.S.-specific background, not a global legal clearance. Operator jurisdiction and source territories remain release-review inputs.

## Reproducible workload

One concurrent user means one authenticated open app tab, with at most one media session. Run an additional two-tab/access-revocation scenario; do not silently model multiple tabs as a single polling client. All high-volume media and upstream calls use controlled endpoints. Never load-test publishers under this plan.

| Profile | Duration and concurrency | Media mix and regional distribution |
| --- | --- | --- |
| Steady | Ramp 0→5,000 over 10 minutes; hold 60 minutes; drain 5 minutes | 30% radio (1,500), 30% podcast (1,500), 20% TV (1,000), 20% browsing (1,000) |
| Burst | After steady hold, ramp 5,000→10,000 over 60 seconds; hold 10 minutes; return to 5,000 over 5 minutes; hold recovery 15 minutes | Same percentages; twice the steady counts. Within the TV cohort, 80% switch to one channel over the first 60 seconds: 1,600 additional starts/60 seconds, about 26.67 resolutions/second. |

For both profiles distribute virtual clients 25% North America, 10% South America, 20% Europe, 10% Africa, 25% Asia, 10% Oceania. This is synthetic test weighting, not a forecast. Use recorded regional load locations where available; network shaping on one host cannot establish regional reachability. Repeat the complete steady/burst cycle three times for P16 and report every run, cold-cache and warm-cache results separately.

Use 100,000 synthetic accounts, 50,000 radio identities, 100 shows / 20,000 episodes, 10 channels / 20 source variants, 7 days of guide data, 1 million saved memberships, and 1 million history/progress records. Mix active and inactive feeds, missing geography, expired sources and blocked records. Use distinct accounts per active client; include the explicit shared-account/two-device conflict scenario separately. These are seeded test sizes, not production inventory claims.

The baseline below counts application HTTP requests; database queries, upstream fetches, media bytes, static assets and worker jobs must be measured separately. User actions are randomized with a fixed seed. N is concurrent tabs; all player-bearing tabs in this baseline count as playing. Paused sessions still poll item detail in the existing implementation and must be covered in a second scenario.

| Request class | Formula / behavior | 5,000 users req/s | 10,000 users req/s |
| --- | --- | ---: | ---: |
| Application access polling | N / 15 seconds | 333.33 | 666.67 |
| Item availability polling | 0.8N / 15 seconds | 266.67 | 533.33 |
| Discovery/list, search, detail | 0.02N total; 50% list, 30% search, 20% detail; paginate | 100.00 | 200.00 |
| Play/resolve including resume | 0.8N / 600 seconds | 6.67 | 13.33 |
| History/start writes | One per play/resolve above (conservative) | 6.67 | 13.33 |
| Radio click reporting | 0.3N / 600 seconds | 2.50 | 5.00 |
| Podcast progress writes | 0.3N / 30 seconds, plus lifecycle events | 50.00 | 100.00 |
| Saves/follows/folder mutations | N / 900 seconds | 5.56 | 11.11 |
| Sign-in/session/bootstrap | N / 1,800 workflows/second × four requests | 11.11 | 22.22 |
| Playback diagnostic batches | Budget one request/player/minute | 66.67 | 133.33 |
| Administration/health HTTP | Fixed background allowance | 2.00 | 2.00 |
| Baseline total | Unrounded sum; excludes burst starts and lifecycle spikes | 851.17 | 1,700.33 |

Add 20% application request headroom for progress lifecycle events, retries and route fan-out: test at least 1,021.4 req/s steady and 2,040.4 req/s burst before the extra popular-channel switches. Each extra switch also generates history and diagnostic events. Report all resulting requests, including rejected/time-out requests; no client-side concurrency cap may hide offered load. Authentication uses a controlled mail sink and approved test accounts; do not generate real email/OAuth-provider load. P02/P14 must replace the four-request workflow allowance and diagnostic budget with observed route traces if actual flows differ, recording any revised totals here.

Existing behavior: [ApplicationGate](../../src/components/account/ApplicationGate.tsx) polls every 15 seconds for all open app tabs; [useAudioPlayback](../../src/lib/modes/useAudioPlayback.ts) polls detail every 15 seconds while playing or paused. Together these contribute 600/1,200 req/s for this mix. Item checks are not active in every playback state today. P14 may consolidate polling, but must preserve access/block response targets and compare measured traffic with this baseline. Include a synchronized-poll case as well as jittered clients.

Background work runs during load: a cold radio catalog refresh at the start and a forced repeat during the burst (ordinary configured refresh is six hours); existing radio health worker at its default concurrency of 16 with controlled probes; 100 podcast feeds checked every 15 minutes (0.111 fetches/second average), with 10 changed feeds and 1,000 new episode records applied during burst; 10 guide feeds hourly (0.0028 fetches/second), with one full guide replacement during burst; 20 TV variants probed every five minutes (0.0667 checks/second). Apply per-host limits, retries and byte budgets in P05/P13; stage all feeds due together to exercise the queue. Report job lag and DB load rather than adding jobs to the HTTP total. These new-worker cadences are test defaults, not implemented schedules.

Media test envelope: 128 kbit/s for radio, 96 kbit/s for podcasts, and a 1/2.5/5 Mbit/s TV ladder, averaging 2.5 Mbit/s per TV viewer. At steady mix that is 2.836 Gbit/s and 1.2762 TB/hour before overhead; burst is double. These bytes belong to controlled test delivery or publisher CDNs, not the application server. This calculation is not a claim of free publisher capacity. If even controlled media delivery cannot be run within available resources, report that test as outstanding. Use full browsers for media quality measurements and protocol clients for bulk API load, reporting both populations separately.

## Release acceptance matrix

Common evidence: exact code revision, hardware/topology, Node version, PostgreSQL major, seed/dataset, timestamp/timezone, commands, sample counts, distributions and raw artifact location. Local checks use the README's Node 26.12.1 and disposable PostgreSQL 17. All targets below are engineering defaults adopted for the next steps, except the user-set cost constraint. None has passed merely because this document exists.

`Controlled` means deterministic publisher fixtures in authorized staging with the full workload above. `Real` means approved sources at normal volume on the device/region matrix. `Production` means only an explicitly authorized rollout. Evaluate latency per route class, playback per mode/device/eligible region, and freshness per source; do not hide a failing slice in a global average. For sparse slices collect more samples or leave the gate open.

| ID / metric | Threshold | Measurement and environment | Accountable evidence owner |
| --- | --- | --- | --- |
| M01 API latency | p95 ≤500 ms, p99 ≤1,500 ms for owned catalog/search/detail/state/user writes; owned playback-policy/resolve portion p95 ≤750 ms, p99 ≤2,000 ms | Client timing plus server/upstream spans, Controlled steady and burst; minimum 1,000 requests per route class per run. Report regional network time separately. | P16 agent; project owner accepts |
| M02 API reliability | ≥99.9% successful valid requests; ≤0.1% unexpected errors/timeouts/unexpected throttling in each run | Controlled, include scheduled offered requests; deliberate invalid/blocked cases reported separately. Publisher failures remain visible in M06. | P16 agent |
| M03 Availability | ≥99.9% successful owned-service probes over 30 days | External 60-second health + authenticated synthetic checks, Production; missing samples count as unknown and cannot prove a pass. | Project owner / operations |
| M04 Controlled startup | ≥99.5% reach playing within 10 seconds audio / 15 seconds TV; successful-start p95 ≤3 seconds audio / ≤5 seconds TV | Play gesture→audible media/advancing video; minimum 200 attempts per required mode/browser cell, Controlled; cancellations reported separately | P09/P13 agents, rechecked P16 |
| M05 Controlled rebuffering | Aggregate stall time / playing-plus-stall time ≤1%; no overlapping playback in 100 rapid mode-switch/cancel sequences | Exclude initial startup and intentional pauses/seeks; minimum 20 sessions of ≥20 minutes per required mode/browser cell, Controlled; report p95 per-session stall ratio too | P09/P13 agents, rechecked P16 |
| M06 Publisher-dependent playback | ≥95% successful starts within 10 seconds audio / 15 seconds TV; p95 successful startup ≤5 seconds audio / ≤8 seconds TV; aggregate rebuffer ratio ≤2% | Real; ≥100 starts per mode/required device/eligible region cell, ≥5 starts per source per eligible sampled region, ≥30 minutes per TV channel per eligible region and ≥10 minutes per podcast show across required devices. Report provider/network failures and each source; failing sources remain withheld or gate stays open. | Project owner for approved lineup; P09/P13/P16 agents for evidence |
| M07 Podcast freshness | ≥95% of reachable active feeds reflected within 30 minutes of first observed publisher change; no active feed unchecked for >60 minutes without visible stale state | Controlled publish timestamps and Real first-observed timestamps over 7 days; report unreachable feeds separately and preserve last good catalog | P06/P09 agents |
| M08 TV source freshness | ≥95% of eligible variants checked within 15 minutes; stale status visible after 30 minutes without evidence | Worker timestamps and injected failures in Controlled; Real normal-volume probes for 7 days. No global health inference from one region. | P13 agent |
| M09 EPG coverage/freshness | ≥90% of published channels have now/next and ≥95% schedule-minute coverage in the next 24 hours; ≥95% of guide updates applied within 2 hours of observation; stale label after 6 hours | Controlled gaps/DST/corrections; Real permitted guides for 7 days. Denominator is all published channels, not only guide-equipped ones; with 10 channels, at least 9 must qualify. | P12/P13 agents |
| M10 Progress/data correctness | Save interval ≤30 seconds plus lifecycle events; resume within ±30 seconds of last acknowledged listening position; zero cross-user access, stale overwrites or lost saved references in required scenarios | Controlled two-device/out-of-order/rewind cases and fresh/upgrade/repeated migrations on disposable PostgreSQL 17; Real physical-device interruption checks. No guarantee of a final write after abrupt device loss. | P03/P08/P09 agents |
| M11 Access/block enforcement | 100% of new protected requests deny revoked users/blocked items after commit; foreground connected player stops within 20 seconds; recheck before resumed playback after reconnect | Controlled account/session/mode/item cases including paused/buffering and background→foreground. Previously disclosed third-party URLs are not revocable by Blomoon. | P04/P09/P13/P14 agents |
| M12 Recovery | RPO ≤24 hours; restore RTO ≤4 hours; loss of one app instance recovers service within 60 seconds; worker lease takeover ≤5 minutes | P16 timed failure drills and restore to separate disposable DB from encrypted off-server backup; require redundant staging for instance-loss evidence | P15/P16 agents; project owner / operations |
| M13 Cost | Additional recurring and one-time spend = $0 under this task; existing server bill recorded separately; no paid source licences or paid add-ons | P15 inventory/current invoice and P16 measured usage/30-day projection: existing server, storage, transfer, backup, monitoring, email and any quota overage. Any positive increment fails until owner revises scope/budget. No promotional credit or free tier assumed. | Project owner |
| M14 Load/queue stability | Complete all three profiles at stated offered load; due-job p95 start lag ≤60 seconds; backlog returns to pre-burst level within 15 minutes; no data loss | Controlled workers active, include crash/retry/provider-outage scenarios; application and media-delivery results separate | P05/P14/P16 agents |

For M03/P17, use a 48-hour limited cohort of at most 100 opted-in accounts, then expand only after applicable gates pass. Observe the intended final cohort for 30 days before closing P17. Pause expansion on an access-control/data-integrity failure, >1% unexpected API failures for five minutes, or a confirmed source-policy violation; use the rehearsed mode-disable/rollback procedure. A failed threshold requires evidence of a fix or an explicit owner-approved revision, not a silent waiver.

## Release blockers and next work

| Blocker | Unblocking evidence / owner | Affected gate |
| --- | --- | --- |
| B01 Broader podcast/TV/guide lineup pending; two P06 podcasts approved | Per-source records above, with free usage basis, territories and delivery method; project owner | P09–P13 and P17 |
| B02 Resolved 2026-11-13: Podcast Index selected | Keyless search/lookup verified, no account or paid service needed; [source records](podcast-sources.md) | P06 directory gate cleared; public search scaling remains P07/P14 |
| B03 Existing server capacity/cost unknown; redundancy not demonstrated | Authorized inventory, actual baseline bill, controlled measurements, off-server backup destination and redundant topology within D02; project owner and P15/P16 agents | P15–P17; not local fixtures |
| B04 Physical devices, regional testers and staging not established | Named operator, available devices/networks, authorized running staging and measured results; project owner | Real matrix and P16 |
| B05 Operating jurisdiction and source-specific conditions unreviewed | Record operator jurisdiction and applicable source/territory review before source publication; project owner | Source release, not fixture implementation |

P01 is complete when these choices, thresholds, owners and explicit blockers are documented and checked. Source permission and production feasibility are later release gates, not claims made by P01. Next step is P02: record existing checks, deterministic fixtures, radio regression scenarios, and browser/device evidence format. No source publication, purchase, deployment, migration, or feature implementation is authorized merely by this document.
