---
type: object
cluster: contracts
universe: live
status: verified
verified: 2026-08-25
entity: src/lib/modes/registry.ts
---

# TerraMode Contract And Registry

`TerraMode` is the shared plugin contract; `terraModes` currently registers only the radio mode.

## Why This Shape

Shared UI asks the active mode for endpoints, labels, filtering behavior, sorting, marker color policy, detail endpoints, and playback config instead of branching on a mode id.

## Shape

- `TerraMode` defines mode id, endpoint builders, sort options, optional country catalog, optional click endpoint, optional playback, labels, marker policy, metric formatting, matchers, and sorter.
- `terraModes` contains a radio entry with REST endpoints under `/api/modes/radio/...`, a radio click endpoint, radio labels, radio marker token, and radio sort/match helpers.
- `getTerraMode` falls back to `defaultMode` if a requested id is not registered.

Citations: `src/lib/modes/types.ts:77`, `src/lib/modes/types.ts:89`, `src/lib/modes/registry.ts:8`, `src/lib/modes/registry.ts:32`, `src/lib/modes/registry.ts:49`, `src/lib/modes/registry.ts:50`, `src/lib/modes/registry.ts:71`

## Connected To

- **owns:** mode registration and shared mode capability surface.
- **owned-by:** `src/lib/modes/types.ts`, `src/lib/modes/registry.ts`.
- **joins:** `TerravueApp`, `useModeDataset`, drawer controls, radio API routes.
- **looks-like-but-is-not:** `TerraModeId` includes future strings such as `podcasts` and `tv`, but those are ghost until registered and implemented.

## If You Change This

- **Hits:** app shell mode selection, drawer labels/filters, endpoint routing, authenticated click recording, playback UI, marker color behavior, API route expectations.
- **Does not hit:** globe internals if the existing `TerraPoint[]` and marker color contract remain valid.

## Surfaces

| Surface | Role |
|---|---|
| `TerravueApp` | Selects active mode and passes mode behavior to hooks/UI |
| `useModeDataset` | Calls mode endpoint builders |
| `SideDrawerList` | Displays labels, sort options, placeholders, and metrics |
| Radio adapter/API | Must satisfy endpoint contracts |

## See

- Source: `src/lib/modes/types.ts`
- Source: `src/lib/modes/registry.ts`
