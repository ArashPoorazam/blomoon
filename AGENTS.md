<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Product Architecture

Terravue is a globe-based live entertainment directory. Its purpose is to help people discover and play streamable media by geography: radio now, podcasts/live audio next, and TV/video only when the media contracts are ready.

Terravue is not a generic live-data globe. Do not add unrelated telemetry, disaster, finance, weather, traffic, social, or novelty modes. A mode must represent an entertainment/media catalog with real playable or inspectable streams.

Terravue has one reusable globe core and removable media modes/plugins. The globe core owns map rendering, country interaction, point rendering, camera behavior, shared visual effects, and extension hooks. A media mode/plugin owns its provider adapter, REST endpoints, labels, filtering/search rules, sorting rules, detail content, playback resolution, and fixtures.

The quality bar is that a media mode can be added, disabled, or removed without changing unrelated modes or adding mode-specific branches to the globe core.

## Canonical Ownership

- `src/components/GlobeScene.tsx` and future globe modules own generic globe rendering, country picking, point picking, camera behavior, and generic effect layers.
- `src/lib/modes/*` owns media mode contracts, registry entries, provider normalization, sorting/searching, playback metadata, and fixture data.
- `src/app/api/modes/{modeId}/.../route.ts` owns public REST resources for media catalogs, details, and playback resolution.
- `src/lib/geo.ts` owns coordinate math, country-code helpers, projection helpers, and geographic validation.
- `src/lib/theme/*` owns design tokens for globe materials, markers, mode colors, effects, spacing, and reusable visual constants.
- Shared UI may depend on shared mode contracts, but it must not know provider response shapes or mode-specific business rules.

If code does not clearly belong to one owner, define the boundary before implementing. Do not solve an ownership problem by scattering conditionals.

## Architecture Approval Bar

- A change must reduce or preserve architectural complexity. Do not accept code that works by making the surrounding model harder to reason about.
- Prefer a small model change that deletes branches over a chain of special cases.
- No random mode checks in shared code. `if (mode.id === "radio")` or similar logic in generic globe/UI code is a design smell unless there is no viable contract-based alternative.
- No plugin-to-plugin imports. Shared behavior moves to a neutral shared module with a clear owner.
- No new abstraction unless it removes real duplication, clarifies a boundary, or turns repeated conditionals into a typed contract.
- No pass-through wrapper helpers that only rename another function. Keep the direct flow unless the wrapper carries policy or meaning.
- No file should cross 1000 lines. Treat components over 400 lines and general modules over 500 lines as decomposition candidates.
- New code must have an obvious deletion path. Temporary branches, compatibility shims, and fixture fallbacks must be named and isolated so they can be removed later.
- Apply a strict maintainability review before accepting broad changes: look for a simpler model that deletes whole branches, keeps media logic in media-owned layers, and prevents spaghetti growth.

## Core Globe Rules

- The globe must render any valid `TerraPoint[]` without knowing what domain produced the points.
- Country selection is a core capability. Use stable ISO country codes for filtering and storage; display names are presentation only.
- Point interaction is shared behavior: hover, select, focus camera, open details, clear selection, and selected-marker rendering should work consistently for every mode.
- Visual effects such as atmosphere, stream activity, arcs, particles, and media availability overlays must be independent configurable layers. Effects must not be baked into mode-specific globe branches.
- Keep Three.js work bounded. Use instancing, memoization, stable keys, cleanup of disposable resources, and cheap `useFrame` loops.
- Animated effects and camera motion must respect reduced-motion preferences and must not block point/country interaction.
- Do not put provider data fetching, provider normalization, playback resolution, or mode-specific metrics inside the globe core.

## Media Mode / Plugin Rules

- A mode starts with the shared contract. Update `TerraMode`, `TerraPoint`, `TerraDataset`, or related types only when the capability is genuinely shared.
- Each mode must define its registry entry, endpoints, labels, loading/empty/fallback copy, marker color strategy, metric formatter, matcher, sorter, provider adapter, playback behavior when applicable, and fixtures.
- Valid mode families are streamable entertainment/media domains: radio, podcasts/live audio, and TV/video. Reject modes that are not part of the media discovery and playback product.
- Provider adapters must normalize external data into Terravue types before UI code sees it.
- Search, sorting, country matching, and display metrics belong to the mode unless they are truly generic.
- Mode removal must be mechanical: unregister the mode, remove its route/provider/fixture files, and leave the app compiling without touching unrelated modes.
- Do not duplicate a provider adapter pattern by copy/paste. Extract a small helper only after the second real use proves the shared shape.
- Do not add FFmpeg, stream proxying, recording, or transcoding unless the feature explicitly requires server-side media processing. Browser-native playback is the default for v1.
- Add `hls.js` only when HLS video or HLS audio support enters scope.

## REST API Rules

- Use Next.js App Router `route.ts` handlers for public REST APIs, external consumers, provider-backed data, and mode resources.
- Keep URLs resource-oriented: `/api/modes/{modeId}/points`, `/api/modes/{modeId}/points/{id}`, `/api/modes/{modeId}/points/{id}/playable`, `/api/modes/{modeId}/search`.
- Use `GET` for reads and URL-query searches. Use `POST` for creation, commands, playback resolution, or inputs that should not live in a URL.
- Validate every boundary input: mode IDs, point IDs, country codes, query params, request bodies, coordinates, stream URLs, provider URLs, and provider responses.
- Return predictable JSON shapes and correct HTTP statuses: `200`, `201`, `400`, `404`, `409`, `429`, `502`, and `503` where appropriate.
- Keep provider secrets server-only. Do not import secret-bearing modules into client components.
- External providers need timeouts, structured error handling, and visible fallback state. Slow or broken providers must not hang or crash the app.
- Include source metadata for external datasets: provider name, URL, attribution, last-updated timestamp, and fallback status.
- `/playable` endpoints resolve a selected media item to a safe stream response. They must not leak private provider payloads or trust unvalidated provider URLs.

## Type And Data Rules

- Shared types are contracts, not dumping grounds. Avoid optional-property sprawl on `TerraPoint` and `TerraMode`.
- Prefer explicit typed models, discriminated unions, and mode-owned extension objects over `any`, broad casts, stringly typed flags, or loose records.
- Parse `unknown` provider data at the boundary and convert it into known internal types. Raw provider objects must not cross into UI.
- Coordinates must be validated numbers: latitude `-90..90`, longitude `-180..180`.
- IDs must be stable, URL-safe, and documented when derived from provider data.
- Timestamps in shared JSON contracts must be ISO strings.
- Stream URLs must be validated server-side before playback. Support `http:` and `https:` only unless a deliberate transport policy is added.
- Fallbacks must not hide broken invariants. If a value is required for correct behavior, make it required at the type boundary.

## Styling And UI Rules

- Use the existing CSS files and design-token variables consistently. Do not introduce another styling system casually.
- Colors, spacing, z-index values, marker colors, and typography should come from theme tokens, CSS variables, or named constants.
- Inline `style={{}}` is only acceptable for truly dynamic runtime values such as canvas measurements or computed transform values.
- Keep product UI dense and operational: country selection, point lists, filtering, detail inspection, loading, empty, error, and fallback states must all be deliberate.
- Controls must be keyboard-accessible where practical, have visible focus states, and not rely on color alone.
- Effects and labels must not obscure selected points, detail panels, controls, or search results.
- Playback UI must expose loading, playing, paused, stopped, and error states honestly. No dead playback controls or fake success states.

## Next.js / React Rules

- Before changing Next.js APIs, routing, caching, metadata, server/client boundaries, or route handlers, read the relevant guide in `node_modules/next/dist/docs/`.
- Use Server Components for server-side reads where possible. Use Route Handlers for public REST APIs and external consumers. Use Server Actions for internal UI mutations when appropriate.
- Add `'use client'` only to components that need browser APIs, React state/effects, event handlers, canvas interaction, or Three.js client rendering.
- Client components must not be `async`. Fetch server data in Server Components, route handlers, hooks, or explicit client-side data utilities.
- Props crossing from Server Components to Client Components must be serializable. Convert `Date`, `Map`, `Set`, class instances, and provider objects into plain JSON-safe data.
- In dynamic route handlers, treat `params` according to the installed Next.js docs for this project. Do not assume older Next.js signatures.
- Do not use browser APIs, React hooks, DOM APIs, or Three.js rendering code in route handlers or Server Components.

## Reliability And Security

- Treat every external media provider as unreliable: outages, malformed data, rate limits, slow responses, broken streams, codec mismatches, and partial responses are normal cases.
- Keep fixture fallback data representative, isolated, and visibly marked as fallback.
- Do not expose stack traces, secrets, provider keys, private URLs, or internal error details in API responses.
- Log provider failures and normalization failures with enough context to debug, but do not log sensitive payloads.
- User-created data paths must be designed for authentication, authorization, validation, abuse protection, persistence, and auditability even if the first version is fixture-backed.
- Sanitize and validate user-provided URLs before playback, embeds, fetches, or links.
- Do not proxy or transcode third-party media streams by default. If proxying is introduced, design bandwidth limits, abuse controls, caching policy, and provider terms compliance first.

## Testing And Verification

- Run `npm run typecheck` after TypeScript changes.
- Run `npm run build` for changes touching Next.js routing, route handlers, server/client boundaries, dynamic imports, or production rendering behavior.
- For globe, canvas, or interaction changes, run the app and verify in a browser: page loads, no console errors, globe is visible, points render, country/point interactions work, and mobile/desktop layouts hold.
- For playback changes, verify that a stream can be resolved, started, paused, stopped, and that broken streams show an error state.
- Add focused tests or testable pure functions for provider normalization, API validation, stream URL validation, country matching, filtering, sorting, ID generation, and coordinate validation.
- Do not claim a live integration works unless it was exercised against the real provider. If it is fixture-backed, say so.

## AI Agent Operating Rules

- Read the relevant files before editing. Do not infer architecture from the prompt alone.
- Make the smallest coherent change that satisfies the request and preserves the architecture.
- If implementation starts requiring scattered special cases, stop and reframe the model before patching more branches.
- If a requested mode is not a media/entertainment mode, stop and challenge the product fit instead of implementing it.
- Prefer direct, boring code. Avoid clever generic engines, magical registries, or reflection unless the codebase already has that pattern and the benefit is concrete.
- Keep behavior and structure honest: no dead buttons, fake persistence, fake search, fake live data, placeholder TODO implementations, or silent "success" states.
- Preserve existing user changes in the worktree. Never revert files you did not intentionally change.
- Keep final responses explicit: what changed, what was verified, what was not verified, and any remaining architectural risk.
