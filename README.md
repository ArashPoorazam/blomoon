# Terravue
Explore live entertainment streams through an interactive 3D globe.

## Phase 1

Terravue currently implements the first usable slice of the product:

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
npm run dev
```

Then open `http://localhost:3000`.

## Data Sources

- Radio: Radio Browser
- Country borders: `world-atlas` simplified country geometry, derived from Natural Earth
