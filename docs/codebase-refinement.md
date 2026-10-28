# Codebase refinement — October 2026

## Module boundaries

| Area | Location | Responsibility |
| --- | --- | --- |
| Country metadata | `src/lib/geo/countries.ts` | Country names, identifiers, aliases and search metadata. No geometry or rendering imports. |
| Map geometry | `src/lib/geo/geometry.ts` | Lazy topology decoding, indexed country geometry, borders and coordinate containment. |
| Coordinates | `src/lib/geo/coordinates.ts` | Numeric validation and globe radius, independent of the atlas. |
| Presentation formatting | `src/lib/format.ts` | Coordinate and date labels, independent of geography. |
| WebGL rendering | `src/components/GlobeScene.tsx` | Dynamically loaded from `GlobeViewport`; keeps Three.js and the atlas out of the shell's synchronous module graph. |
| Database connection | `src/db/index.ts` | One pooled client and one Drizzle instance per server process. |
| Discovery and recommendations | `src/lib/modes/radio/` | Server-side catalog access, ranking and snapshot pagination. |
| Saved collections | `src/lib/persistence/favouriteFolders.ts` | Folder ownership, sharing, bulk imports and saved-station counts. |

`countries.json` is generated from the installed `world-atlas` package. Run `npm run geo:sync` when upgrading the atlas; CI runs `geo:check`. The metadata source is 12,032 bytes versus 756,420 bytes for the full atlas. This is a source-data comparison, not a measured network-transfer or page-load improvement. Geometry remains available to the globe's separate chunk. Duplicate atlas identifiers retain the primary country name and geometry, including Australia.

## Database behavior

Folder imports use two set-based statements for station copying and saved-count updates instead of up to three statements per station. Deletion reconciles saved membership in batches of 1,000 IDs. A station's count changes only when the user's saved membership is created or removed; retaining it in another folder preserves its count. Shared previews return three names with an exact count rather than transferring every name.

Recommendation transactions return the stored snapshot and release their connection before hydration uses the shared pool. This prevents requests from occupying every connection while waiting for another connection. Snapshot pagination also skips unnecessary catalog-generation lookups. Recommendation ranking avoids spreading entire collections into function arguments.

The pool remains five connections per process. Account for app replicas and worker processes when sizing PostgreSQL. Recommendation creation still ranks the eligible catalog for a new profile; production profiling should guide any later candidate-index or ranking redesign. No throughput or latency guarantee is implied by the local tests.

## Dependencies and removed code

Direct dependencies are pinned to the stable releases verified on October 28, 2026, including Next.js 16.4.3, React 19.3.1, Three.js 0.186.1, Better Auth 1.7.14 and Vitest 5.0.5. TypeScript was already at the latest stable version, 7.0.2. Node.js 26.12.1 is declared in `.node-version`, package engines, Docker and CI. The system Node installation was not changed.

The scoped `@esbuild-kit/core-utils` override uses esbuild 0.28.2 to replace Drizzle Kit's vulnerable 0.18.x dependency. Keep it until the upstream loader updates, and recheck migration/config loading when changing it.

Removed the unused 577-line fixture catalog, obsolete provider fallback helpers, unused scan/cache settings and provider DTOs, and unused client-side filtering/sorting methods from the mode contract. Database migrations remain intact. TypeScript now checks unused locals and parameters; `typecheck` regenerates Next.js route types first.

## Authentication upgrade and deployment

Apply `0019_auth_provider_identity.sql` through `npm run db:migrate` **before running the upgraded application**. Better Auth 1.7.3+ identifies accounts by `(provider_id, account_id)` and no longer writes `issuer`. The migration checks for duplicate provider/account keys under a table lock, adds the corresponding unique index, makes the historical issuer column nullable, and removes the old issuer-based index. Existing users, account rows, credentials and issuer values are retained. Duplicate keys stop the migration for review; it does not merge or delete identities.

Back up before the cutover and deploy the code and migration together. Once new accounts have null issuer values, reverting packages alone to Better Auth 1.7.1 is not a safe rollback. Follow the [Better Auth upgrade guide](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/guides/1-7-upgrade-guide.mdx) when planning account-data recovery. No production database was changed during this work.

## Verification

- A clean `npm ci` succeeds; the final dependency audit reports zero vulnerabilities. Drizzle's updated compiler dependency was checked by applying every migration to a fresh database.
- TypeScript, generated route types, country metadata parity and production build pass.
- All 329 tests pass with every database integration suite enabled against a fresh disposable PostgreSQL 18.6 database. Deployment still targets PostgreSQL 17; that server version was not exercised locally.
- Coverage includes a 43,000-station catalog, a 1,005-station folder import/deletion, empty folders, duplicate imports, saved-count preservation and migration rejection of ambiguous account identities.
- The production browser check verified password sign-in, the dynamically loaded globe, country search/selection, station details and camera focus against an isolated synthetic station. No browser errors were observed. The current React Three Fiber dependency emits a `THREE.Clock` deprecation warning.
- Live radio audio, Google OAuth, real-device installation and VPS deployment were not exercised.

Run the integration suite only against a disposable migrated database:

```sh
DATABASE_URL=postgres://.../disposable npm run db:migrate
DATABASE_URL=postgres://.../disposable \
AUTH_INTEGRATION=1 FAVOURITES_INTEGRATION=1 \
RADIO_DIRECTORY_INTEGRATION=1 RADIO_HEALTH_INTEGRATION=1 OMNISIRE_INTEGRATION=1 \
npm test -- --maxWorkers=1
```

Use a separate database for browser fixtures: some existing integration tests deliberately expect an otherwise empty catalog.
