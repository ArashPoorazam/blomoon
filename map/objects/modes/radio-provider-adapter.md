---
type: object
cluster: modes
universe: live
status: verified
verified: 2026-08-25
entity: src/lib/modes/radio
---

# Radio Provider Adapter

The radio mode adapter turns Radio Browser data into Terravue contracts, caches live records, falls back to fixtures, supports search/pagination, resolves playable streams, and exposes a mode-owned persistence snapshot for station storage.

## Why This Shape

External provider payloads are unreliable and must stay mode-owned. The adapter normalizes unknown provider data into internal records and returns only `TerraDataset`, `TerraPointPage`, `TerraPointDetail`, or `TerraPlayableAudio` to shared code.

## Shape

- `normalizeStation` rejects missing ids, invalid countries, unsafe URLs, failed checks, invalid coordinates, and then builds `RadioStationRecord`.
- `getRadioDataset`, country marker/page functions, detail lookup, and playback resolution expose the radio mode API to route handlers.
- The catalog caches records by id and country, uses live data when possible, and falls back to fixtures with source fallback metadata.
- Live list/search pages use provider paging, vocabulary parsing, count caches, and exact/lower-bound totals.
- Playable resolution tries a clicked station URL, validates stream URL safety, probes with `HEAD` then ranged `GET`, and caches the result.
- Station persistence snapshots are derived from normalized `RadioStationRecord` values so database code does not read Radio Browser raw payloads.

Citations: `src/lib/modes/radio/normalize.ts:9`, `src/lib/modes/radio/normalize.ts:18`, `src/lib/modes/radio/catalog.ts:28`, `src/lib/modes/radio/catalog.ts:43`, `src/lib/modes/radio/catalog.ts:124`, `src/lib/modes/radio/catalog.ts:169`, `src/lib/modes/radio/catalog.ts:174`, `src/lib/modes/radio/catalog.ts:207`, `src/lib/modes/radio/catalog.ts:226`, `src/lib/modes/radio/catalog.ts:487`, `src/lib/modes/radio/searchPages.ts:49`

## Connected To

- **owns:** Radio Browser provider normalization, fallback, sorting/searching, stream validation.
- **owned-by:** `src/lib/modes/radio/`.
- **joins:** shared mode contracts, REST routes, `useModeDataset`, playback hook.
- **looks-like-but-is-not:** `terraModes` registry, which declares the radio mode surface but should not hold provider logic.

## If You Change This

- **Hits:** API response shape, station persistence snapshots, visible fallback notice, marker/list data consistency, search totals, playback reliability.
- **Does not hit:** generic globe marker code if normalized `TerraPoint` coordinates and ids remain stable.

## Surfaces

| Surface | Role |
|---|---|
| API routes | Call adapter functions |
| Client data hook | Consumes adapter output through routes |
| Playback hook | Calls playable endpoint backed by adapter validation |
| Radio Browser | External data dependency |

## See

- Source: `src/lib/modes/radio/`
