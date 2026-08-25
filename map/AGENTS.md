# Terravue ICM Map

This is a System Map for Terravue, a Next.js globe-based live entertainment directory. Use it to load only the source files needed for a change.

The application source and root `AGENTS.md` are authoritative. This map is a routing layer with citations, not a second specification.

## Where To Go

| Task | Read first |
|---|---|
| Understand map rules and boundaries | `CONTEXT.md` |
| Change shared mode contracts or point shape | `objects/contracts/terra-point.md`, `objects/contracts/terra-mode.md` |
| Change globe rendering, country picking, markers, or camera behavior | `objects/globe/globe-core.md`, `objects/globe/country-geometry.md` |
| Change radio provider, fallback, search, or playback resolution | `objects/modes/radio-provider-adapter.md`, then the relevant process card |
| Change drawer, search UI, detail UI, or playback UI | `objects/surfaces/app-shell-and-drawer.md`, `objects/surfaces/playback.md` |
| Change API route behavior | `objects/surfaces/rest-api.md` |
| Change auth, account, database, theme persistence, favorites, or clicks | `objects/surfaces/account-auth-and-database.md`, `objects/surfaces/favourites-persistence.md` |
| Add or remove a media mode | `processes/add-or-change-mode.md`, `objects/contracts/terra-mode.md` |
| Check broad impact before editing | `effects/CONTEXT.md` |

## Important Objects

| Object | Card |
|---|---|
| Shared point/detail/dataset contracts | `objects/contracts/terra-point.md` |
| Mode registry and mode-owned behavior contract | `objects/contracts/terra-mode.md` |
| Globe core | `objects/globe/globe-core.md` |
| Country geometry and ISO helpers | `objects/globe/country-geometry.md` |
| Radio provider/catalog adapter | `objects/modes/radio-provider-adapter.md` |
| Client dataset state hook | `objects/modes/mode-dataset-state.md` |
| REST API routes | `objects/surfaces/rest-api.md` |
| App shell and drawer | `objects/surfaces/app-shell-and-drawer.md` |
| Playback | `objects/surfaces/playback.md` |
| Account auth and database | `objects/surfaces/account-auth-and-database.md` |
| Favourites persistence | `objects/surfaces/favourites-persistence.md` |

## Main Workflows

| Workflow | Card |
|---|---|
| Load radio catalog and fallback data | `processes/load-radio-catalog.md` |
| Search, filter, and paginate visible stations | `processes/search-and-pagination.md` |
| Select country or point | `processes/select-country-and-point.md` |
| Resolve and play a stream | `processes/resolve-playback.md` |
| Add or change a media mode | `processes/add-or-change-mode.md` |

## Operating Rule

For a specific task, open `effects/CONTEXT.md`, the listed object/process cards, and the cited source files. Do not load the whole repository unless the cards show the change crosses most boundaries.
