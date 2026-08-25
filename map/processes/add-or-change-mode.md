---
type: process
status: verified
verified: 2026-08-25
consumes:
  - ../objects/contracts/terra-mode.md
  - ../objects/contracts/terra-point.md
  - ../objects/surfaces/rest-api.md
produces:
  - ../objects/surfaces/app-shell-and-drawer.md
  - ../objects/globe/globe-core.md
---

# Add Or Change Media Mode

Mode changes start from the shared `TerraMode` contract and must keep provider logic inside mode-owned modules and routes.

## Input -> Movement -> Output

Input is a requested streamable entertainment/media mode or a change to an existing mode. The agent verifies product fit, updates or adds mode-owned adapter/route/fixture/registry pieces, and preserves generic globe/UI contracts. Output is a registered mode that can provide normalized `TerraPoint` data and optional playback without shared mode-id branches.

## Steps

1. Root instructions limit valid mode families to radio, podcasts/live audio, and TV/video when contracts are ready. Citation: `AGENTS.md:60`.
2. The shared contract defines what every mode must supply. Citation: `src/lib/modes/types.ts:77`.
3. The current registry has only the radio mode wired. Citation: `src/lib/modes/registry.ts:8`.
4. The app shell selects active mode through the registry and passes it to `useModeDataset`. Citation: `src/components/TerravueApp.tsx:34`.
5. The hook depends on mode endpoint builders and JSON response contracts, not provider payloads. Citation: `src/lib/modes/useModeDataset.ts:36`.
6. Radio route shape is the current implemented resource pattern for points, details, playback, search, and country resources. Citation: `src/app/api/modes/radio/search/route.ts:11`.
7. Globe rendering receives `TerraPoint[]` and marker policy only. Citation: `src/components/GlobeScene.tsx:12`.

## If You Change This

- **Hits:** mode registry, mode contracts, mode routes, provider adapter, fixtures, drawer controls, playback if applicable, tests/typecheck/build.
- **Does not hit:** existing radio internals when adding another mode unless a shared contract must change.

## Surfaces

| Surface | Role |
|---|---|
| Human reviewer | Approves product fit and broad contract changes |
| Mode modules | Own provider normalization/search/sort/playback |
| App shell/drawer | Consume mode contract |
| Globe | Consumes generic points |

## See

- Objects: `../objects/contracts/terra-mode.md`, `../objects/contracts/terra-point.md`, `../objects/surfaces/rest-api.md`
- Source: `src/lib/modes/types.ts`
