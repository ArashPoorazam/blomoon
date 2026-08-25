---
type: process
status: verified
verified: 2026-08-25
consumes:
  - ../objects/globe/globe-core.md
  - ../objects/globe/country-geometry.md
  - ../objects/modes/mode-dataset-state.md
produces:
  - ../objects/surfaces/app-shell-and-drawer.md
---

# Select Country And Point

Country and marker interactions update shell state, fetch scoped data, focus the camera, and open drawer detail.

## Input -> Movement -> Output

Input is a globe country click, marker click, drawer row click, or clear action. The shell stores selected country or point id, the mode hook fetches country markers/list/detail as needed, and the globe/drawer receive the updated selected state. Output is highlighted country/point, focused camera, filtered list, or detail view.

## Steps

1. `Earth` converts a mesh click point to lat/lon and asks `getCountryAtCoordinates` for a country. Citation: `src/components/globe/Earth.tsx:42`.
2. `TerravueApp.selectCountry` toggles selected country and clears hover state. Citation: `src/components/TerravueApp.tsx:70`.
3. `useModeDataset` fetches country marker data when selected country and mode country catalog exist. Citation: `src/lib/modes/useModeDataset.ts:127`.
4. `PointMarkers` calls `onSelect(point)` for facing marker clicks. Citation: `src/components/globe/PointMarkers.tsx:116`.
5. `TerravueApp.selectPoint` delegates to `modeState.selectPoint` and opens the drawer. Citation: `src/components/TerravueApp.tsx:59`.
6. `useModeDataset` finds selected point from merged known points and fetches detail. Citation: `src/lib/modes/useModeDataset.ts:229`.
7. `GlobeScene` receives selected point/country props and renders focus, markers, Earth, and outlines. Citation: `src/components/GlobeScene.tsx:39`.
8. `SideDrawer` switches list/detail view based on selected id. Citation: `src/components/SideDrawer.tsx:74`.

## If You Change This

- **Hits:** country geometry, hook fetch dependencies, drawer detail behavior, selected marker rendering, camera focus.
- **Does not hit:** Radio Browser host discovery unless country-specific provider calls change.

## Surfaces

| Surface | Role |
|---|---|
| Globe | Country and point interaction |
| App shell | Stores selected state |
| Mode hook | Fetches scoped markers/detail |
| Drawer | Displays selected detail or list |

## See

- Objects: `../objects/globe/globe-core.md`, `../objects/modes/mode-dataset-state.md`
- Source: `src/components/TerravueApp.tsx`
