import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { radioPlaybackIds } from "./identityStore";
import { normalizeStation } from "./normalize";
const enabled = process.env.RADIO_DIRECTORY_INTEGRATION === "1";
const canonical = "71a120c7-80ca-420d-bac1-894288c48e15";
const aliases = ["71a120c7-80ca-420d-bac1-894288c48e12", "71a120c7-80ca-420d-bac1-894288c48e13", "71a120c7-80ca-420d-bac1-894288c48e14"];
afterAll(async () => { if (enabled) await getDb().delete(schema.radioStationAliases).where(eq(schema.radioStationAliases.canonicalId, canonical)); });
describe.skipIf(!enabled)("playback provider identity lookup (isolated database)", () => {
  it("returns canonical first and only two sorted aliases", async () => {
    const record = normalizeStation({ stationuuid: canonical, name: "Playback test", countrycode: "US", url: "https://radio.example/live", lastcheckok: 1 })!;
    await getDb().insert(schema.radioStationAliases).values([canonical, ...aliases].map(stationId => ({ stationId, canonicalId: canonical, identityKey: stationId, streamKey: stationId, record })));
    expect(await radioPlaybackIds(aliases[2], new AbortController().signal)).toEqual([canonical, aliases[0], aliases[1]]);
  });
});
