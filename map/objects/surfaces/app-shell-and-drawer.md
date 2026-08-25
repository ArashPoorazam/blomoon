---
type: object
cluster: surfaces
universe: live
status: verified
verified: 2026-08-25
entity: src/components/TerravueApp.tsx
---

# App Shell And Drawer

`TerravueApp` orchestrates active mode, selected country/point, theme, audio playback, globe props, and the drawer; `SideDrawer` and `SideDrawerList` render list/detail/search/filter controls.

## Why This Shape

The shell is the interaction join between generic globe behavior and mode-owned catalog behavior. The drawer is dense operational UI for filtering, list paging, detail inspection, and playback entry.

## Shape

- `TerravueApp` holds active mode id, drawer collapsed state, hovered point, selected country, listed-on-globe toggle, and theme id.
- It calls `useModeDataset` and `useAudioPlayback`, then passes generic point/country callbacks into `GlobeScene` and list/detail props into `SideDrawer`.
- `SideDrawer` switches between list and detail views based on selected id and displays a loading status panel.
- `SideDrawerList` owns search input, mode switcher, country menu, sort menu, listed-on-globe toggle, load-more controls, provider notice, and visible count copy.

Citations: `src/components/TerravueApp.tsx:26`, `src/components/TerravueApp.tsx:37`, `src/components/TerravueApp.tsx:59`, `src/components/TerravueApp.tsx:70`, `src/components/TerravueApp.tsx:97`, `src/components/TerravueApp.tsx:136`, `src/components/SideDrawer.tsx:42`, `src/components/SideDrawer.tsx:89`, `src/components/SideDrawerList.tsx:34`, `src/components/SideDrawerList.tsx:88`, `src/components/SideDrawerList.tsx:155`

## Connected To

- **owns:** top-level client interaction state and drawer display.
- **owned-by:** `src/components/TerravueApp.tsx`, `src/components/SideDrawer.tsx`, `src/components/SideDrawerList.tsx`.
- **joins:** globe core, mode registry, mode dataset state, playback, theme, geo country list.
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
