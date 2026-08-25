---
type: object
cluster: surfaces
universe: live
status: verified
verified: 2026-08-25
entity: src/app/api/modes/radio
---

# REST API Surface

The REST surface exposes public radio browsing/playback resources and authenticated account, favorites, theme, and station-click resources through Next.js App Router route handlers.

## Why This Shape

Route handlers are the boundary between client UI and unreliable provider data. They validate query/path inputs, call mode-owned adapter functions, and return predictable JSON with explicit cache headers.

## Shape

- `/api/modes/radio/points` returns the radio dataset.
- `/api/modes/radio/search` validates `limit`, `offset`, `q`, `sort`, and optional `countryCode`, then returns a `TerraPointPage`.
- `/api/modes/radio/points/[id]` uses async `params` and returns detail or 404.
- `/api/modes/radio/points/[id]/playable` is a `POST`, uses async `params`, returns no-store playable audio, 404, or 502.
- `/api/users/me`, `/api/users/me/theme`, and `/api/users/me/favourites` require `requireUser` and return no-store JSON.
- `/api/users/me/favourites/[modeId]/[pointId]` uses async `params` and dispatches through the mode persistence registry.
- `/api/modes/radio/points/[id]/click` requires login and records the click through the server persistence registry.
- Country routes validate async `countryCode` params and query params before returning marker datasets or paginated country pages.

Citations: `src/app/api/modes/radio/points/route.ts:5`, `src/app/api/modes/radio/search/route.ts:11`, `src/app/api/modes/radio/search/route.ts:28`, `src/app/api/modes/radio/points/[id]/route.ts:5`, `src/app/api/modes/radio/points/[id]/playable/route.ts:5`, `src/app/api/modes/radio/countries/[countryCode]/points/route.ts:6`, `src/app/api/modes/radio/countries/[countryCode]/search/route.ts:6`, `src/app/api/users/me/route.ts:7`, `src/app/api/users/me/theme/route.ts:24`, `src/app/api/users/me/favourites/route.ts:47`, `src/app/api/users/me/favourites/route.ts:58`, `src/app/api/users/me/favourites/[modeId]/[pointId]/route.ts:93`, `src/app/api/modes/radio/points/[id]/click/route.ts:123`

## Connected To

- **owns:** public radio resources, authenticated user/favorites resources, and HTTP validation/status behavior.
- **owned-by:** `src/app/api/modes/radio/**/route.ts`, `src/app/api/users/me/**/route.ts`, `src/app/api/auth/[...all]/route.ts`.
- **joins:** radio adapter, radio API param parsers, Better Auth, persistence registry, client data/favorites hooks, playback hook.
- **looks-like-but-is-not:** provider adapter; routes should not normalize provider payloads directly.

## If You Change This

- **Hits:** `TerraMode` endpoint builders, `useModeDataset`, playback hook, cache behavior, build verification.
- **Does not hit:** globe rendering if returned `TerraPoint` shape remains compatible.

## Surfaces

| Surface | Role |
|---|---|
| Browser/client hooks | Calls JSON endpoints |
| External consumers | Can call public REST resources |
| Radio adapter | Provides route data |
| Next runtime | Executes route handlers |

## See

- Source: `src/app/api/modes/radio/`
