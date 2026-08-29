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

## VPS Deployment

Production runs through Docker Compose with Traefik, Postgres, the Next.js app image, and a one-shot migration image.

First-time VPS setup:

```bash
sudo mkdir -p /opt/blomoon
sudo chown "$USER":"$USER" /opt/blomoon
git clone <repo-url> /opt/blomoon
cd /opt/blomoon
cp .env.production.example .env.production
```

Fill `.env.production` with production secrets, then point `BLOMOON_DOMAIN` DNS at the VPS. `GHCR_USERNAME` and `GHCR_TOKEN` are only needed when the GitHub Container Registry package is private.

GitHub Actions deploys automatically from `main`. Configure these repository secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_PRIVATE_KEY`
- `VPS_PORT` if SSH is not on `22`
- `VPS_APP_DIR` if the app is not in `/opt/blomoon`

Manual deploy fallback:

```bash
cd /opt/blomoon
BLOMOON_REGISTRY_IMAGE=ghcr.io/<owner>/<repo> ./deploy.sh <git-sha-or-main>
```

Run a database backup from the VPS with:

```bash
docker compose --env-file .env.production -f compose.prod.yml --profile backup run --rm backup
```

Run an operator check from your laptop or the VPS with:

```bash
npm run check:prod
```

The check uses `https://blomoon.ir` by default. To check another deployment, set `BLOMOON_ORIGIN`:

```bash
BLOMOON_ORIGIN=http://localhost:3000 npm run check:prod
```

It verifies public health, HTTPS redirect behavior, auth guards, radio catalog/search/detail responses, and attempts radio playback resolution. Live stream playback resolution is reported as a warning by default because external radio streams can be flaky; set `BLOMOON_STRICT_PLAYBACK=1` to make it fail the command.

The default Traefik rule only requests a certificate for `BLOMOON_DOMAIN`. Add a `www` router after the `www` DNS record is pointed at the VPS.

## Data Sources

- Radio: Radio Browser
- Country borders: `world-atlas` simplified country geometry, derived from Natural Earth
