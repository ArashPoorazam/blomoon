---
type: object
cluster: modes
universe: live
status: verified
verified: 2026-08-25
entity: src/lib/modes/useModeDataset.ts
---

# Mode Dataset State

`useModeDataset` is the client-side state machine for a mode's world markers, country markers, visible list page, selected point, detail, loading labels, and provider error/fallback notice.

## Why This Shape

The UI needs fast fixture seeding, live refresh, country-specific markers, paginated visible lists, selected-point continuity, and detail fallback without teaching the globe or drawer provider rules.

## Shape

- Seeds state from an optional initial dataset when mode ids match.
- Fetches world data from `mode.dataEndpoint`.
- Fetches selected-country marker data from `mode.countryCatalog.markerEndpoint`.
- Fetches visible list pages from `mode.listEndpoint` using country, debounced query, sort, limit, and offset.
- Merges known points by id so selected details can survive between world, country, and list data sets.
- Returns loading flags, fallback/provider error, visible totals, selection methods, and pagination methods.

Citations: `src/lib/modes/useModeDataset.ts:36`, `src/lib/modes/useModeDataset.ts:41`, `src/lib/modes/useModeDataset.ts:79`, `src/lib/modes/useModeDataset.ts:127`, `src/lib/modes/useModeDataset.ts:179`, `src/lib/modes/useModeDataset.ts:229`, `src/lib/modes/useModeDataset.ts:288`, `src/lib/modes/useModeDataset.ts:294`, `src/lib/modes/useModeDataset.ts:334`

## Connected To

- **owns:** client mode loading and merged point state.
- **owned-by:** `src/lib/modes/useModeDataset.ts`.
- **joins:** `TerraMode`, `TerraDataset`, route endpoints, `TerravueApp`, drawer, globe.
- **looks-like-but-is-not:** provider cache; live/fallback records are owned server-side by mode adapters.

## If You Change This

- **Hits:** app shell state, drawer loading and list behavior, globe marker set, selection/detail fallback, API endpoint contract expectations.
- **Does not hit:** provider normalization rules unless client state starts depending on new fields.

## Surfaces

| Surface | Role |
|---|---|
| `TerravueApp` | Reads returned state and actions |
| Globe | Receives merged `globePoints` and selected point |
| Drawer | Receives visible list, loading, totals, detail, errors |
| API routes | Must match expected dataset/page/detail response shapes |

## See

- Source: `src/lib/modes/useModeDataset.ts`
