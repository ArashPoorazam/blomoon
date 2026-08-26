---
type: object
cluster: surfaces
universe: live
status: verified
verified: 2026-08-26
entity: src/lib/auth/server.ts
---

# Account Auth And Database

Better Auth, Drizzle, and PostgreSQL-backed account state live behind server-only modules. Client components receive sanitized DTOs and call route handlers; they do not import database/auth server modules.

## Why This Shape

Public browsing stays available without login, while account profile, theme persistence, favorites, and click attribution require a validated Better Auth session. Database access is centralized so auth/provider payloads do not cross into globe or mode-neutral UI.

## Shape

- `src/db/schema.ts` defines plural Better Auth tables, `selected_theme`, stations, user favourites, and per-user station clicks.
- `src/db/index.ts` creates the Drizzle/Postgres client only when `DATABASE_URL` is configured.
- `src/db/readiness.ts` verifies the required account/persistence tables before auth routes and user APIs query them.
- `src/lib/auth/server.ts` maps Better Auth core models to plural Drizzle tables, configures Better Auth UUID id generation for UUID auth columns, and exposes `requireUser`/safe user DTO helpers.
- `/api/auth/[...all]` mounts Better Auth's Next.js handler.
- `/api/users/me` and `/api/users/me/theme` expose sanitized account and theme state.
- `src/lib/app-config/server.ts` converts server env into serializable client config for Google auth visibility and account contact links.

Citations: `src/db/schema.ts:17`, `src/db/schema.ts:30`, `src/db/schema.ts:44`, `src/db/schema.ts:65`, `src/db/schema.ts:76`, `src/db/schema.ts:115`, `src/db/schema.ts:126`, `src/db/readiness.ts:14`, `src/lib/auth/server.ts:52`, `src/lib/auth/server.ts:68`, `src/lib/auth/server.ts:106`, `src/lib/app-config/server.ts:5`, `src/app/api/auth/[...all]/route.ts:8`, `src/app/api/users/me/route.ts:7`, `src/app/api/users/me/theme/route.ts:24`

## Connected To

- **owns:** auth session lookup, account DTO shape, PostgreSQL schema, persisted theme preference.
- **owned-by:** `src/db/`, `src/lib/auth/`, `src/lib/users/`, account API routes.
- **joins:** account menu UI, favorites persistence, Better Auth route.
- **looks-like-but-is-not:** globe mode state; client shell reads DTOs only.

## If You Change This

- **Hits:** database migrations, Better Auth table mapping, account menu, theme persistence, authenticated user APIs.
- **Does not hit:** radio provider normalization or globe rendering unless API DTO contracts change.

## Surfaces

| Surface | Role |
|---|---|
| Better Auth | Owns sessions, accounts, credential/OAuth auth |
| Drizzle/Postgres | Stores account, station, favorite, click state |
| Readiness check | Turns missing setup into safe 503 responses |
| Route handlers | Enforce authentication and sanitize responses |
| Client account UI | Reads DTOs and calls user endpoints |
| App config | Exposes only safe auth/contact capability flags to client UI |

## See

- Source: `src/db/schema.ts`
- Source: `src/db/index.ts`
- Source: `src/db/readiness.ts`
- Source: `src/lib/auth/server.ts`
- Source: `src/lib/app-config/`
- Source: `src/lib/users/`
- Source: `src/app/api/auth/[...all]/route.ts`
- Source: `src/app/api/users/me/`
