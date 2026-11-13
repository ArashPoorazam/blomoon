import { build } from 'esbuild';
await build({ entryPoints: ['src/lib/ingestion/child.ts'], bundle: true, platform: 'node', target: 'node26', format: 'cjs', outfile: 'dist/ingestion-child.cjs' });
