# Change-Impact Index

One job: name the cards to open before changing a major component. This index routes only; card waterfalls hold details.

## If Changing Shared Contracts

Open:
- `../objects/contracts/terra-point.md`
- `../objects/contracts/terra-mode.md`
- `../objects/modes/mode-dataset-state.md`
- `../objects/surfaces/rest-api.md`
- `../processes/add-or-change-mode.md`

Human check: verify no provider raw shape crosses into UI and run `npm run typecheck`.

## If Changing Globe Interaction Or Rendering

Open:
- `../objects/globe/globe-core.md`
- `../objects/globe/country-geometry.md`
- `../objects/surfaces/theme-tokens.md`
- `../processes/select-country-and-point.md`

Human check: run the app and verify visible globe, markers, country selection, point hover/select, camera focus, and responsive layout.

## If Changing Radio Provider Or Fallback

Open:
- `../objects/modes/radio-provider-adapter.md`
- `../objects/contracts/terra-point.md`
- `../objects/surfaces/rest-api.md`
- `../processes/load-radio-catalog.md`
- `../processes/search-and-pagination.md`

Human check: distinguish live provider verification from fixture fallback; do not claim live integration works unless exercised against Radio Browser.

## If Changing Search, Filtering, Or Pagination

Open:
- `../objects/modes/mode-dataset-state.md`
- `../objects/surfaces/app-shell-and-drawer.md`
- `../objects/surfaces/rest-api.md`
- `../processes/search-and-pagination.md`

Human check: verify list totals, load-more state, provider error/fallback notice, and selected point continuity.

## If Changing Playback

Open:
- `../objects/surfaces/playback.md`
- `../objects/modes/radio-provider-adapter.md`
- `../objects/surfaces/rest-api.md`
- `../processes/resolve-playback.md`

Human check: verify stream resolution, play, pause, stop, and broken-stream error state.

## If Changing Auth, Database, Favourites, Or Clicks

Open:
- `../objects/surfaces/account-auth-and-database.md`
- `../objects/surfaces/favourites-persistence.md`
- `../objects/surfaces/app-shell-and-drawer.md`
- `../objects/surfaces/rest-api.md`
- `../objects/modes/radio-provider-adapter.md`

Human check: run `npm run typecheck`, `npm test`, `npm run build`, and browser-verify logged-out browsing plus authenticated flows when `DATABASE_URL` is available.

## If Adding Or Removing A Mode

Open:
- `../processes/add-or-change-mode.md`
- `../objects/contracts/terra-mode.md`
- `../objects/contracts/terra-point.md`
- `../objects/modes/mode-dataset-state.md`
- `../objects/surfaces/app-shell-and-drawer.md`
- `../objects/surfaces/rest-api.md`

Human check: reject non-media modes; removal must be mechanical and must leave unrelated modes compiling.
