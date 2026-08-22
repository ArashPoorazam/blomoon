# Terravue
Explore the world through an interactive 3D globe of live data and services.

## Phase 1

Terravue currently implements the first usable slice of the product:

- a monochrome interactive 3D globe
- simplified country border lines
- an earthquake mode backed by USGS GeoJSON feeds
- a cached server-side data adapter with fallback sample data
- a right-side drawer for filtering points and viewing details

## Development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Data Sources

- Earthquakes: USGS Earthquake Hazards Program GeoJSON feeds
- Country borders: `world-atlas` simplified country geometry, derived from Natural Earth
