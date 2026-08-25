# Terravue System Map Context

One job: route agents through the live Terravue codebase without turning the map into a duplicate spec.

## Source Universes

| Universe | Meaning in this repo |
|---|---|
| live | Implemented and wired into the application. Use these files for changes. |
| leftover | Present but not the main path. No leftover implementation was identified in this pass. |
| ghost | Named by product architecture but not implemented yet. `podcasts` and `tv` are allowed future `TerraModeId` values, but only radio is registered today. |

## Authoritative Homes

| Fact | Authoritative source |
|---|---|
| Product and architecture rules | root `AGENTS.md` |
| Current user-facing product slice | `README.md` |
| Scripts and runtime dependencies | `package.json` |
| Next configuration | `next.config.ts` |
| Shared mode contracts | `src/lib/modes/types.ts` |
| Registered mode behavior | `src/lib/modes/registry.ts` |
| Globe rendering and interaction | `src/components/GlobeScene.tsx`, `src/components/globe/` |
| Radio provider behavior | `src/lib/modes/radio/` |
| Public REST resources | `src/app/api/modes/radio/**/route.ts` |

## Generated Or Per-Run State

- `node_modules/`, `.next/`, and `.next/dev/types/` are dependency/build output, not map inputs unless diagnosing tooling.
- Server-side in-memory caches live in radio provider/catalog modules and reset with the process.
- Client runtime state lives in React hooks and component state.
- Fixture fallback data lives in `src/lib/modes/fixtures/radio.ts` and is intentionally visible as fallback through `DataSourceInfo.isFallback`.

## Human Approval Points

- Do not move, rename, delete, or archive existing source files without approval.
- Stop before adding a non-entertainment mode; root `AGENTS.md` limits modes to streamable entertainment/media.
- Before changing Next.js APIs, routing, caching, metadata, server/client boundaries, or route handlers, read the installed docs under `node_modules/next/dist/docs/`.
- Run `npm run typecheck` after TypeScript changes. Run `npm run build` for route, server/client boundary, dynamic import, or production rendering changes.
- For globe, canvas, interaction, or playback changes, run the app and verify browser behavior.

## How To Use This Map

1. Start from `AGENTS.md`.
2. Open `effects/CONTEXT.md` for the change category.
3. Read only the cards and cited source files listed there.
4. If a card and source disagree, trust source and update the card.
