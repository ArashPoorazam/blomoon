import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const atlas = require("world-atlas/countries-50m.json");
const target = new URL("../src/lib/geo/countries.json", import.meta.url);
// Store only identifiers and names so country filters never import map geometry.
const metadata = atlas.objects.countries.geometries
  .filter(({ type, properties }) => properties?.name && (type === "Polygon" || type === "MultiPolygon"))
  .map(({ id, properties }) => ({ id: id == null ? null : String(id), name: properties.name }));
const output = `${JSON.stringify(metadata, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== output) {
    throw new Error("Country metadata is stale. Run npm run geo:sync after updating world-atlas.");
  }
} else {
  writeFileSync(target, output);
}
