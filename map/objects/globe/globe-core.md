---
type: object
cluster: globe
universe: live
status: verified
verified: 2026-08-25
entity: src/components/GlobeScene.tsx
---

# Globe Core

The globe core is the Three.js canvas composition that renders Earth, country outlines, point markers, selected-point focus, and orbit controls from generic point and country inputs.

## Why This Shape

`GlobeScene` stays domain-neutral: it receives points, colors, selected country/point, theme, and callbacks, while media/provider work stays outside the globe.

## Shape

- `GlobeScene` composes `<Canvas>`, `Earth`, `PointMarkers`, `CameraFocus`, and `AdaptiveOrbitControls`.
- `Earth` draws a canvas-generated globe texture, selected-country overlay, and country outlines; clicks map a hit point to lat/lon and then country info.
- `PointMarkers` batches non-selected markers by resolved color, uses instanced meshes for visuals and hit targets, and renders the selected point separately.
- Camera focus and orbit behavior live in `CameraControls.tsx`.

Citations: `src/components/GlobeScene.tsx:12`, `src/components/GlobeScene.tsx:39`, `src/components/globe/Earth.tsx:34`, `src/components/globe/Earth.tsx:42`, `src/components/globe/PointMarkers.tsx:34`, `src/components/globe/PointMarkers.tsx:41`, `src/components/globe/CameraControls.tsx:21`

## Connected To

- **owns:** generic rendering, point/country interaction callbacks, marker rendering, camera behavior.
- **owned-by:** `src/components/GlobeScene.tsx` and `src/components/globe/`.
- **joins:** `TerraPoint`, country geometry helpers, theme tokens, `TerravueApp`.
- **looks-like-but-is-not:** radio map behavior; the globe does not fetch, normalize, sort, or resolve playback.

## If You Change This

- **Hits:** browser interaction verification, marker visibility, camera focus, selected-country outline, theme rendering.
- **Does not hit:** Radio Browser provider API or radio normalization unless point coordinate/color requirements change.

## Surfaces

| Surface | Role |
|---|---|
| End user | Clicks countries and markers, hovers markers, orbits globe |
| `TerravueApp` | Supplies selected state and callbacks |
| Theme modules | Provide material and marker colors |

## See

- Source: `src/components/GlobeScene.tsx`
- Source: `src/components/globe/`
