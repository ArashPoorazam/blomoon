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
- `RESEND_API_KEY`
- `BLOMOON_AUTH_EMAIL_FROM`, for example `Blomoon <no-reply@example.com>`

Password accounts require email verification before login. Use Resend's `onboarding@resend.dev` sender only for local testing; production senders should use a verified Resend domain.

Google sign-in is optional and only appears when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured. Production Google OAuth should use `https://blomoon.ir` as `BETTER_AUTH_URL`, `blomoon.ir` as the authorized domain, `https://blomoon.ir` as the application home page, `https://blomoon.ir/privacy` as the privacy policy, `https://blomoon.ir/terms` as the terms of service, and `https://blomoon.ir/api/auth/callback/google` as the authorized redirect URI. Public support contact is `blomoon.support@gmail.com`.

## Data Sources

- Radio: Radio Browser
- Country borders: `world-atlas` simplified country geometry, derived from Natural Earth
