# Blomoon
Explore live entertainment streams through an interactive 3D globe.

## Phase 1

Blomoon currently implements the first usable slice of the product:

- a monochrome interactive 3D globe
- simplified country border lines
- a radio mode backed by Radio Browser
- server-side stream URL validation before playback
- a cached server-side provider adapter with fallback sample data
- a right-side drawer for filtering stations, viewing details, and starting playback

Future modes should stay inside the entertainment/media product: podcasts/live audio first, then TV/video when the playback contracts are ready.

## Development

```bash
npm install
npm run db:migrate
npm run db:check
npm run dev
```

Then open `http://localhost:3000`.

Create `.env.local` from `.env.example` before running the app. Account features require:

- `DATABASE_URL`
- `BETTER_AUTH_URL`, for example `http://localhost:3000`
- `BETTER_AUTH_SECRET`, generated with `openssl rand -base64 32`

Google sign-in is optional and only appears when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured. Account-menu contact rows are read from `BLOMOON_CONTACT_GITHUB_URL`, `BLOMOON_CONTACT_TELEGRAM_URL`, and `BLOMOON_CONTACT_EMAIL`; unset values are hidden.

## Data Sources

- Radio: Radio Browser
- Country borders: `world-atlas` simplified country geometry, derived from Natural Earth
