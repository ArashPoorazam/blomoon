---
type: object
cluster: surfaces
universe: live
status: verified
verified: 2026-08-25
entity: src/lib/persistence/registry.ts
---

# Favourites Persistence

Favorites and station click attribution are authenticated, server-side mode persistence concerns. Shared UI keeps favorite state as `{ modeId, pointId }`; persistence dispatches through a mode registry.

## Why This Shape

The globe and drawer must not grow mode-specific database branches. The persistence registry lets each media mode normalize and persist its own catalog records while user-facing favorites remain mode-neutral.

## Shape

- `ModePersistenceAdapter` defines add/list/remove favorite and click recording methods.
- `registry.ts` registers mode persistence adapters and groups favorites by registered mode.
- The radio adapter resolves a normalized radio persistence snapshot before upserting `stations`.
- Favorite insert/delete update station star counters inside transactions; click recording upserts per-user click rows and increments aggregate station clicks.
- User favorite endpoints dispatch by `modeId`; radio click endpoint records through the registry.
- Client favorite state is a mode-neutral key set with optimistic update and rollback; the app shell supplies mode labels for optimistic favorite grouping.

Citations: `src/lib/persistence/types.ts:17`, `src/lib/persistence/registry.ts:7`, `src/lib/persistence/registry.ts:15`, `src/lib/persistence/radio.ts:34`, `src/lib/persistence/radio.ts:50`, `src/lib/persistence/radio.ts:65`, `src/lib/persistence/radio.ts:124`, `src/lib/persistence/radio.ts:161`, `src/app/api/users/me/favourites/route.ts:47`, `src/app/api/users/me/favourites/[modeId]/[pointId]/route.ts:93`, `src/app/api/modes/radio/points/[id]/click/route.ts:123`, `src/components/favourites/useFavourites.ts:74`

## Connected To

- **owns:** favorite refs, grouped favorites response, station persistence, star/click counter mutations.
- **owned-by:** `src/lib/persistence/`, favorite API routes, mode-owned radio persistence snapshot.
- **joins:** `SideDrawerList` star controls, `FavouritesDrawer`, radio catalog adapter.
- **looks-like-but-is-not:** `TerraMode` UI registry; persistence registry is server-only and stores database behavior.

## If You Change This

- **Hits:** user favorites endpoints, click endpoint, station schema, client favorite hook, favorite drawer.
- **Does not hit:** globe marker rendering if returned `TerraPoint` shape remains compatible.

## Surfaces

| Surface | Role |
|---|---|
| Client drawer | Displays favorite stars and opens auth for logged-out users |
| Favorites drawer | Groups saved points by mode |
| Persistence registry | Dispatches authenticated mutations by mode id |
| Radio persistence adapter | Converts radio records into stored station rows |

## See

- Source: `src/lib/persistence/`
- Source: `src/components/favourites/`
- Source: `src/app/api/users/me/favourites/`
- Source: `src/app/api/modes/radio/points/[id]/click/route.ts`
- Source: `src/lib/modes/radio/catalog.ts`
