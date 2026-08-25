---
type: object
cluster: globe
universe: live
status: verified
verified: 2026-08-25
entity: src/lib/geo.ts
---

# Country Geometry And Codes

`src/lib/geo.ts` owns country features, ISO code normalization, coordinate validation, country lookup, border meshes, and country outline extraction.

## Why This Shape

Country selection and provider matching both need stable country codes, while rendering needs geometry from `world-atlas`. This module bridges atlas ids, ISO alpha/numeric codes, provider aliases, and valid lat/lon checks.

## Shape

- Coordinates are valid only inside latitude `-90..90` and longitude `-180..180`.
- Country lookups use topojson-derived features, `d3-geo` containment, ISO maps, name aliases, and atlas-only region overrides.
- Provider alpha codes can be normalized into atlas numeric codes and converted back to alpha codes when Radio Browser needs them.
- Country borders and selected-country outlines are exposed as GeoJSON line data.

Citations: `src/lib/geo.ts:94`, `src/lib/geo.ts:102`, `src/lib/geo.ts:106`, `src/lib/geo.ts:144`, `src/lib/geo.ts:174`, `src/lib/geo.ts:184`, `src/lib/geo.ts:211`, `src/lib/geo.ts:220`

## Connected To

- **owns:** country identity, coordinate validation, country geometry.
- **owned-by:** `src/lib/geo.ts`, `src/lib/geo/countryPlacement.ts`, `src/lib/geo/isoCountries.ts`.
- **joins:** `Earth`, `CountryOutlines`, radio normalization, radio API country validation, drawer country filter.
- **looks-like-but-is-not:** UI country filter state, which belongs to `TerravueApp` and drawer components.

## If You Change This

- **Hits:** country picking, provider country matching, estimated station placement, API country-code validation, drawer country lists, border rendering.
- **Does not hit:** playback stream validation unless a country field becomes required in playable responses.

## Surfaces

| Surface | Role |
|---|---|
| Globe | Reads geometry and country lookup |
| Radio adapter/API | Normalizes and validates country codes |
| Drawer | Lists known countries |

## See

- Source: `src/lib/geo.ts`
- Source: `src/lib/geo/`
