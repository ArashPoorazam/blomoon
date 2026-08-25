---
type: process
status: verified
verified: 2026-08-25
consumes:
  - ../objects/modes/mode-dataset-state.md
  - ../objects/modes/radio-provider-adapter.md
  - ../objects/surfaces/rest-api.md
produces:
  - ../objects/surfaces/app-shell-and-drawer.md
---

# Search And Pagination

The drawer search/filter controls drive paginated mode list endpoints, and returned pages replace or append visible points.

## Input -> Movement -> Output

Input is query, sort, country code, and pagination state from UI. The client hook debounces query changes, calls the active mode list endpoint, and the radio route validates params before asking the provider adapter for a page. Output is a visible point list, total metadata, next offset, and loading/error state.

## Steps

1. `SideDrawerList` renders search input, country filter, sort menu, and load-more controls. Citation: `src/components/SideDrawerList.tsx:88`.
2. `TerravueApp` passes query/sort/country/list callbacks from `useModeDataset` to the drawer. Citation: `src/components/TerravueApp.tsx:136`.
3. `useModeDataset` debounces search text. Citation: `src/lib/modes/useModeDataset.ts:65`.
4. The hook calls `mode.listEndpoint` with country, limit, offset, query, and sort. Citation: `src/lib/modes/useModeDataset.ts:179`.
5. The radio registry builds `/api/modes/radio/search` with query params. Citation: `src/lib/modes/registry.ts:14`.
6. The search route validates pagination, query, sort, and country input before calling `getRadioPointPage`. Citation: `src/app/api/modes/radio/search/route.ts:11`.
7. `getRadioPointPage` tries live page search and falls back to cached/fixture records. Citation: `src/lib/modes/radio/catalog.ts:124`.
8. Load more calls the next offset and merges the returned points. Citation: `src/lib/modes/useModeDataset.ts:302`.

## If You Change This

- **Hits:** route query validation, `TerraMode.listEndpoint`, drawer controls, loading/error copy, Radio Browser search behavior.
- **Does not hit:** playable stream validation unless list results need new playback fields.

## Surfaces

| Surface | Role |
|---|---|
| End user | Types, filters, sorts, loads more |
| Client hook | Debounces/fetches/merges |
| Radio API | Validates and pages |
| Provider adapter | Searches live or fallback records |

## See

- Objects: `../objects/modes/mode-dataset-state.md`, `../objects/surfaces/app-shell-and-drawer.md`, `../objects/surfaces/rest-api.md`
- Source: `src/lib/modes/useModeDataset.ts`
