# Media regression matrix and evidence format

P02 establishes repeatable scenarios; it does not certify devices, sources or capacity. Use [P01 targets](decisions.md) for thresholds, regions and ownership, and [controlled fixtures](../../test/fixtures/media/README.md) for local media. Do not use public publishers for deterministic tests or load generation.

## Radio regression scenarios

Run `npm test` for the default suite. Database rows below require the explicit disposable-database procedure in [codebase refinement](../codebase-refinement.md#verification), PostgreSQL **17** to match deployment, and fresh/upgrade/repeated-migration checks in P03. Existing integration suites are coverage, not evidence of having run them in P02. Never reuse a real account or live database.

| ID | Setup and action | Required invariant | Existing automated coverage / additional execution |
| --- | --- | --- | --- |
| R01 Discovery | Load country/globe/list, sparse catalog, provider fallback; change selection quickly | Selection and source count stay consistent; fallback is visible; no stale results | `src/lib/modes/radio/discovery.test.ts`, `src/lib/modes/radio/provider.test.ts`, `src/components/usePointSources.test.ts`, `src/lib/modes/useModeDataset.test.ts`; browser globe/list flow pending |
| R02 Search | Search Latin accents and Persian/Arabic variants; paginate, clear query, change filter | Normalized matching, bounded pages, stale requests ignored | `src/lib/modes/radio/discovery.test.ts`, `src/lib/modes/useModeList.test.ts`, `src/lib/modes/modeListState.test.ts`; browser input/pagination pending |
| R03 Saved folders | Two users; save a station to two folders, import a large/empty folder, delete one folder, reload | Other folder saves/accounts survive; owner isolation; identity references remain stable | `src/lib/persistence/favouriteFolders.integration.test.ts`, `src/lib/modes/radio/identity.integration.test.ts` (DB opt-in); browser reload pending |
| R04 Sharing | Share station and folder, open link as another user, rotate sharing, import into another mode | Correct station/folder identity; old share invalidated; other owner's data cannot be mutated; no external return redirects | `src/lib/sharing/links.test.ts`, `src/lib/persistence/favouriteFolderSharing.integration.test.ts` (DB opt-in); browser copy/open flow pending |
| R05 Playback lifecycle | Start, buffer, pause/resume, stop; defer resolve and cancel/switch before it completes | One player; source cleaned up; late callbacks ignored; no duplicate history/lookup | `src/lib/modes/useAudioPlayback.test.ts`, `src/lib/modes/audioStartup.test.ts`; real audible/background checks pending |
| R06 Blocks | Block station or mode during playback and pause; retry detail/playable and discovery | New requests denied; saved references preserved; foreground stops by M11 target | `src/lib/admin/enforcement.test.ts`, `src/lib/admin/integration.test.ts`, `src/lib/modes/radio/health/integration.test.ts`; P04 mounted lifecycle tests now verify playing/paused/buffering stops and bounded checks; actual browser timing remains a P09/P16 release gate |
| R07 Session revocation | Suspend user or revoke session from another session; wait for access poll | App unmounted, player cleaned up, sign-in state displayed; protected requests denied | `src/components/account/ApplicationGate.test.tsx` covers revoked response, mode disable, failed verification and poll cleanup; `src/lib/admin/integration.test.ts` covers DB suspension/session deletion; actual auth-to-browser flow pending |
| R08 Mode switching | Resolve radio slowly; remove mode/switch selection while resolution/start is pending | Old audio cannot start, no overlapping sessions or stale state | `src/lib/modes/useAudioPlayback.test.ts` covers removal and selection race; P04 adds equal-ID cross-mode tests and synthetic video-engine cleanup; only radio is registered, actual supported-browser TV switching remains P11 |
| R09 History/data | Start/resume same station; merge aliases with saved/history references | Preserve daily history and account ownership; no duplicate start on resume | `src/lib/playback-history/history.test.ts`, `src/lib/modes/radio/identity.integration.test.ts`, `src/lib/modes/useAudioPlayback.test.ts`; migration evidence belongs to P03 |

These scenarios preserve baseline behavior; they do not assert that all future M10/M11 targets already pass. Preserve unavailable saved records rather than deleting them to make assertions pass.

## Browser/device execution matrix

Each cell must record exact OS/browser/build, device, network, region, code revision, fixture/approved source IDs, sample count and outcome. Version labels below are selection rules from P01, not claims about currently installed browsers. Record versions when executing. Emulator/jsdom results cannot fill a physical-device cell.

| Cell | Required environment | Run |
| --- | --- | --- |
| W1 | Windows, current/previous stable Chrome, Edge, Firefox | R01–R09; keyboard, seek/resume and video controls as implemented |
| M1 | macOS, current/previous Safari and current Chrome | R01–R09; native HLS and supported fullscreen/PiP |
| A1 | Physical Android, Chrome, current/previous supported OS major | R01–R09; install/relaunch, lock/unlock, interruption, Wi-Fi/mobile handover |
| I1 | Physical iPhone, Safari, current/previous supported iOS major | R01–R09; install/relaunch, safe areas, lock/unlock, interruption, network change, native HLS |

Run controlled tests separately from approved real sources, using P01's geographic sample and per-cell counts. Include README's offline page, service-worker cache isolation and update-during-playback checks. Podcast/TV controls remain `not implemented` until their steps land; never record them as passes because radio plays.

## Evidence record template

Copy into the relevant step evidence, one record per environment/scenario group:

```text
Step / scenario IDs / date (Asia/Tehran):
Owner / exact revision / uncommitted changed paths:
Kind: unit | loopback HTTP | DB integration | browser fixture | physical device | approved provider | load | production
OS / hardware / browser build / Node / PostgreSQL major:
Region / network / fixture clock / seed / source permission reference:
Command or exact interaction sequence:
Expected invariant / P01 metric and threshold:
Actual result / sample count / timing distribution / skipped checks:
Artifacts (redacted logs, route trace, screenshot or recording):
Pre-existing failure vs introduced regression:
Limitations / blocker / next owner and action:
```

For route-budget measurement, record request method/path template, trigger, count and elapsed time; exclude cookies, tokens, account IDs, queries containing personal data, enclosure credentials and signed URLs. Capture idle, active, paused, search, save, share and resume separately. Compare application-access polling (15 seconds) and item polling while active/paused (15 seconds) with P01 before revising its four-request workflow allowance. P02 has no full browser route trace; that measurement remains pending in P14 and must precede capacity claims.
