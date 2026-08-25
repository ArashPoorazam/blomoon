---
type: object
cluster: contracts
universe: live
status: verified
verified: 2026-08-25
entity: src/lib/modes/types.ts
---

# TerraPoint And Dataset Contracts

`TerraPoint`, `TerraPointDetail`, `TerraDataset`, and `TerraPointPage` are the shared JSON-safe shape that lets the globe, drawer, API routes, and media modes exchange points without provider payloads crossing into UI.

## Why This Shape

The globe must render any valid `TerraPoint[]`, while media modes own provider-specific normalization and metrics. The contract keeps shared fields narrow and leaves mode-specific display values in `metrics`.

## Shape

- `TerraPoint` carries stable identity, mode id, name, latitude, longitude, optional country code, optional prominence, timestamp, summary, and display metrics.
- `TerraPointDetail` extends a point with label/value fields and optional source URL.
- `DataSourceInfo` carries provider name, URL, attribution, ISO timestamp, and fallback state.
- `TerraPointPage` adds pagination and total-count metadata to a dataset.

Citations: `src/lib/modes/types.ts:5`, `src/lib/modes/types.ts:20`, `src/lib/modes/types.ts:28`, `src/lib/modes/types.ts:36`, `src/lib/modes/types.ts:42`

## Connected To

- **owns:** shared point/dataset JSON contract.
- **owned-by:** `src/lib/modes/types.ts`.
- **joins:** `src/components/GlobeScene.tsx`, `src/components/SideDrawer*.tsx`, `src/lib/modes/useModeDataset.ts`, `src/app/api/modes/radio/**/route.ts`.
- **looks-like-but-is-not:** `RadioStationRecord` in `src/lib/modes/radio/types.ts`, which is mode-private normalized provider state.

## If You Change This

- **Hits:** provider normalization, fixtures, route responses, `useModeDataset`, globe markers, drawer rows/detail, playback detail typing.
- **Does not hit:** Radio Browser raw response typing unless the radio adapter must expose a different normalized shape.

## Surfaces

| Surface | Role |
|---|---|
| Globe | Reads `TerraPoint[]` for marker placement and selection |
| Drawer | Reads points and detail fields for list/detail display |
| API routes | Return datasets, pages, details, and playable responses |
| Radio adapter | Produces normalized points and details |

## See

- Source: `src/lib/modes/types.ts`
