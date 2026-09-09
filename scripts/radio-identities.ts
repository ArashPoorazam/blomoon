import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { getDb, schema } = await import("../src/db");
  const { eq, sql } = await import("drizzle-orm");
  const { canonicalizeRadioRecords } = await import("../src/lib/modes/radio/stationIdentity");
  const { publishStationIdentities, persistedIdentityRecords } = await import("../src/lib/modes/radio/identityStore");
  const { directoryEntry } = await import("../src/lib/modes/radio/directorySync");
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(72409188)`);
    const [generation] = await tx.select().from(schema.radioCatalogGenerations).where(eq(schema.radioCatalogGenerations.active, true));
    if (!generation) throw new Error("Synchronize the catalog first");
    const rows = await tx.select().from(schema.radioCatalogEntries).where(eq(schema.radioCatalogEntries.generationId, generation.id));
    const records = rows.map((row) => row.record);
    const all = new Map((await persistedIdentityRecords(tx)).map((record) => [record.point.id, record]));
    for (const record of records) all.set(record.point.id, record);
    const grouped = canonicalizeRadioRecords([...all.values()]);
    const groups = new Map<string, string[]>();
    for (const alias of grouped.aliases) groups.set(alias.canonicalId, [...(groups.get(alias.canonicalId) ?? []), alias.stationId]);
    console.log(JSON.stringify({ providerRecords: records.length, canonicalStations: grouped.records.length,
      mergedGroups: [...groups.values()].filter((ids) => ids.length > 1).length,
      danceWave: grouped.records.filter((record) => record.point.name.startsWith("Dance Wave"))
        .map((record) => ({ name: record.point.name, id: record.point.id, variants: groups.get(record.point.id)?.length })) }, null, 2));
    if (!process.argv.includes("--apply")) return;
    const canonical = await publishStationIdentities(tx, records);
    await tx.execute(sql`select consolidate_radio_accounts()`);
    await tx.delete(schema.radioCatalogEntries).where(eq(schema.radioCatalogEntries.generationId, generation.id));
    for (let offset = 0; offset < canonical.length; offset += 250) {
      await tx.insert(schema.radioCatalogEntries).values(canonical.slice(offset, offset + 250).map((record) => directoryEntry(record, generation.id)));
    }
    await tx.update(schema.radioCatalogGenerations).set({ stationCount: canonical.length }).where(eq(schema.radioCatalogGenerations.id, generation.id));
    await tx.delete(schema.radioRecommendationSnapshots);
    console.log("Canonical catalog and account references committed atomically.");
  });
}
void main().then(() => process.exit(0)).catch((error: unknown) => { console.error(error); process.exit(1); });
