---
type: object
cluster: surfaces
universe: live
status: verified
verified: 2026-08-26
entity: src/components/TerravueApp.tsx
---

# App Shell And Drawer

`TerravueApp` orchestrates active mode, selected country/point, account viewer state, favourites, theme, audio playback, globe props, and the drawer; `SideDrawer` and `SideDrawerList` render list/detail/search/filter/favourite controls.

## Why This Shape

The shell is the interaction join between generic globe behavior and mode-owned catalog behavior. The drawer is dense operational UI for filtering, list paging, detail inspection, and playback entry.

## Shape

- `TerravueApp` receives server-derived app config for Google auth visibility/contact links and holds active mode id, drawer collapsed state, hovered point, selected country, listed-on-globe toggle, account/auth modal state, favourites drawer state, and theme id.
- It calls `useModeDataset` and `useAudioPlayback`, then passes generic point/country callbacks into `GlobeScene` and list/detail props into `SideDrawer`.
- It calls `useViewer` and `useFavourites` for sanitized account/favourite state and persists logged-in theme changes through `/api/users/me/theme`.
- `SideDrawer` switches between list and detail views based on selected id and displays a loading status panel.
- `SideDrawerList` renders station rows and delegates the compact list command surface to `DrawerListToolbar`, which owns search input, mode switcher, prominent favourites entry, country menu, sort menu, listed-on-globe toggle, provider notice, and visible count copy.

Citations: `src/components/TerravueApp.tsx:30`, `src/components/TerravueApp.tsx:38`, `src/components/TerravueApp.tsx:48`, `src/components/TerravueApp.tsx:75`, `src/components/TerravueApp.tsx:105`, `src/components/TerravueApp.tsx:154`, `src/components/TerravueApp.tsx:183`, `src/components/TerravueApp.tsx:231`, `src/components/SideDrawer.tsx:42`, `src/components/SideDrawer.tsx:89`, `src/components/SideDrawerList.tsx:35`, `src/components/SideDrawerList.tsx:64`, `src/components/drawer/DrawerListToolbar.tsx:34`, `src/components/drawer/DrawerListToolbar.tsx:75`, `src/components/drawer/DrawerListToolbar.tsx:181`

## Connected To

- **owns:** top-level client interaction state and drawer display.
- **owned-by:** `src/components/TerravueApp.tsx`, `src/components/SideDrawer.tsx`, `src/components/SideDrawerList.tsx`.
- **joins:** globe core, mode registry, mode dataset state, playback, theme, geo country list, viewer/favorites hooks.
- **looks-like-but-is-not:** media provider logic; UI reads normalized contracts only.

## If You Change This

- **Hits:** globe/drawer interaction, selection behavior, filtering UX, playback entry, responsive/browser verification.
- **Does not hit:** server provider caches unless UI starts requiring different route responses.

## Surfaces

| Surface | Role |
|---|---|
| End user | Uses controls, searches, selects, plays |
| Globe | Receives shell callbacks/state |
| Mode hook | Supplies shell data and actions |
| CSS | Defines layout and control styling |

## See

- Source: `src/components/TerravueApp.tsx`
- Source: `src/components/SideDrawer.tsx`
- Source: `src/components/SideDrawerList.tsx`
- Source: `src/components/drawer/DrawerListToolbar.tsx`
