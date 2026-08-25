---
type: object
cluster: surfaces
universe: live
status: verified
verified: 2026-08-25
entity: src/lib/theme
---

# Theme Tokens

Theme modules own globe material colors, marker colors, theme ids, and marker color resolution for the app.

## Why This Shape

Visual constants are centralized so globe and UI code can render mode/theme state without scattering literal colors.

## Shape

- `GlobeTheme` defines ocean, land, border, selected-country, and marker color tokens.
- `resolvePointMarkerColor` maps either a single color or prominence bucket to a concrete marker color.
- `terraThemes` currently provides `night` and `atlas`, with `defaultTheme`, lookup, next-theme cycling, and token resolution helpers.

Citations: `src/lib/theme/globe.ts:1`, `src/lib/theme/globe.ts:7`, `src/lib/theme/globe.ts:27`, `src/lib/theme/globe.ts:57`, `src/lib/theme/themes.ts:3`, `src/lib/theme/themes.ts:11`, `src/lib/theme/themes.ts:54`, `src/lib/theme/themes.ts:58`

## Connected To

- **owns:** named visual tokens and marker color resolution.
- **owned-by:** `src/lib/theme/`.
- **joins:** `TerravueApp`, `GlobeScene`, `PointMarkers`, mode registry marker color token.
- **looks-like-but-is-not:** CSS layout/theme variables; CSS lives under `src/app/*.css` and `src/lib/theme/global.css`.

## If You Change This

- **Hits:** globe appearance, selected country outline color, marker colors, theme toggle behavior, visual browser verification.
- **Does not hit:** provider data loading or API routes.

## Surfaces

| Surface | Role |
|---|---|
| Globe | Reads material and marker colors |
| App shell | Switches active theme |
| Mode registry | Refers to marker color tokens |

## See

- Source: `src/lib/theme/globe.ts`
- Source: `src/lib/theme/themes.ts`
