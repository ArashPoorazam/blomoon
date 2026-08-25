---
type: process
status: verified
verified: 2026-08-25
consumes:
  - ../objects/modes/radio-provider-adapter.md
  - ../objects/contracts/terra-point.md
produces:
  - ../objects/surfaces/rest-api.md
---

# Load Radio Catalog

The server builds a normalized radio dataset from Radio Browser or fixture fallback and returns it through radio dataset routes.

## Input -> Movement -> Output

Input is a route or adapter call requesting radio points. The adapter refreshes or reuses a cached catalog, normalizes live records, falls back to fixtures when live data fails, and annotates source metadata. Output is a `TerraDataset` or `TerraPointPage`.

## Steps

1. Route `/api/modes/radio/points` calls `getRadioDataset`. Citation: `src/app/api/modes/radio/points/route.ts:5`.
2. `getRadioDataset` reads `getRadioCatalog` and returns `worldRecords` mapped to `TerraPoint`. Citation: `src/lib/modes/radio/catalog.ts:43`.
3. `getRadioCatalog` reuses fresh cache or shares an in-flight refresh. Citation: `src/lib/modes/radio/catalog.ts:206`.
4. Refresh tries live world records first and creates a live source on success. Citation: `src/lib/modes/radio/catalog.ts:226`.
5. On failure, refresh keeps a non-fallback cache or creates fixture records with fallback source. Citation: `src/lib/modes/radio/catalog.ts:235`.
6. Radio station normalization rejects unusable provider records before producing internal records. Citation: `src/lib/modes/radio/normalize.ts:9`.

## If You Change This

- **Hits:** world markers, fallback notice, API cache headers, fixture quality, provider outage behavior.
- **Does not hit:** drawer list pagination if `TerraPointPage` search endpoints are unchanged.

## Surfaces

| Surface | Role |
|---|---|
| API route | Entry point |
| Radio adapter | Provider/fallback movement |
| Client hook | Consumes JSON output |

## See

- Objects: `../objects/modes/radio-provider-adapter.md`, `../objects/surfaces/rest-api.md`
- Source: `src/lib/modes/radio/catalog.ts`
