/** Creates and drops ONLY randomly named disposable databases on a local PG17 cluster. */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

if (process.env.P06_DISPOSABLE !== "1") throw new Error("Set P06_DISPOSABLE=1 for a disposable local cluster");
const url = new URL(process.env.P06_TEST_DATABASE_URL!);
if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) throw new Error("Only local disposable clusters supported");
const admin = postgres(url.toString(), { max: 1, onnotice: () => {} });
const scratch = await mkdtemp(join(tmpdir(), "blomoon-p06-migrations-"));
const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
await mkdir(join(scratch, "meta"));
await writeFile(join(scratch, "meta/_journal.json"), JSON.stringify({ ...journal, entries: journal.entries.filter((e: { idx: number }) => e.idx < 22) }));
for (const entry of journal.entries.filter((e: { idx: number }) => e.idx < 22)) {
  await copyFile(`drizzle/${entry.tag}.sql`, join(scratch, `${entry.tag}.sql`));
}
const userId = "10000000-0000-4000-8000-000000000001";
const stationId = "10000000-0000-4000-8000-000000000002";
const folderId = "10000000-0000-4000-8000-000000000003";
async function seed(client: ReturnType<typeof postgres>) {
  await client`insert into users(id,email) values (${userId}, 'p03@example.test')`;
  await client`insert into accounts(user_id,account_id,provider_id,password) values (${userId}, 'p03', 'credential', 'synthetic')`;
  await client`insert into media_items(id, mode_id, provider_id, provider_item_id, name, summary, country_code, country, latitude, longitude, location_precision)
    values (${stationId}, 'radio','radio-browser',${stationId},'Preserved station','Synthetic','364','Iran',35,51,'station')`;
  await client`insert into radio_station_aliases(station_id,canonical_id,identity_key,stream_key,record) values (${stationId},${stationId},'p03','p03','{}')`;
  await client`insert into radio_stations(media_item_id, stream_url) values (${stationId},'https://fixture.invalid/audio')`;
  await client`insert into user_favourite_folders(id,user_id,mode_id,name,share_token,shared_at) values (${folderId},${userId},'radio','Shared fixture','p03-synthetic-share-token',now())`;
  await client`insert into user_favourite_folder_items(folder_id,media_item_id) values (${folderId},${stationId})`;
  await client`insert into user_playback_history(user_id,media_item_id,played_on) values (${userId},${stationId},'2026-11-12')`;
  await client`insert into user_media_clicks(user_id,media_item_id,click_count) values (${userId},${stationId},2)`;
}
async function snapshot(client: ReturnType<typeof postgres>) {
  const result: Record<string, unknown> = {};
  for (const table of ['users','accounts','radio_station_aliases','radio_stations','user_favourite_folders','user_favourite_folder_items','user_saved_media_items','user_playback_history','user_media_clicks']) {
    result[table] = await client`select * from ${client(table)}`;
  }
  result.media = await client`select to_jsonb(media_items) - 'kind' as item from media_items`;
  return JSON.stringify(result);
}
async function contracts(client: ReturnType<typeof postgres>) {
  assert.equal((await client`select count(*)::int as n from podcast_shows`)[0].n, 0);
  await assert.rejects(client`insert into podcast_shows(media_item_id) values (${stationId})`, {code:'23514'});
  await client`update media_items set name='Previous application write' where id=${stationId}`;
  assert.equal((await client`select kind from media_items where id=${stationId}`)[0].kind,'station');
}

try {
  const [{ version }] = await admin`select current_setting('server_version_num')::int as version`;
  assert.ok(version >= 170000 && version < 180000, `PostgreSQL 17 required, got ${version}`);
  for (const scenario of ['fresh','upgrade']) {
    const name = `blomoon_p06_${scenario}_${randomUUID().replaceAll('-','')}`;
    await admin`create database ${admin(name)}`;
    const connection = new URL(url); connection.pathname = `/${name}`;
    const client = postgres(connection.toString(), { max: 1, onnotice: () => {} });
    try {
      const db = drizzle(client);
      await migrate(db, { migrationsFolder: scenario === 'upgrade' ? scratch : 'drizzle' });
      await seed(client);
      const before = await snapshot(client);
      if (scenario === 'upgrade') {
        const failed = join(scratch, 'interrupted');
        await mkdir(join(failed, 'meta'), { recursive: true });
        await writeFile(join(failed, 'meta/_journal.json'), JSON.stringify(journal));
        for (const entry of journal.entries) await copyFile(`drizzle/${entry.tag}.sql`, join(failed, `${entry.tag}.sql`));
        const last = '0022_podcast_catalog.sql';
        await writeFile(join(failed, last), (await readFile(join(failed, last), 'utf8')) + '\n--> statement-breakpoint\nSELECT 1 / 0;');
        await assert.rejects(migrate(db, { migrationsFolder: failed }));
        assert.equal(await snapshot(client), before, 'Failed migration must roll back without changing saved data');
        assert.equal((await client`select table_name from information_schema.tables where table_name='podcast_shows'`).length, 0);
      }
      await migrate(db, { migrationsFolder: 'drizzle' });
      await migrate(db, { migrationsFolder: 'drizzle' });
      assert.equal(await snapshot(client), before, 'Existing account, media, folder, share and history rows must survive');
      await contracts(client);
      console.log(`${scenario}: migration/repetition, saved-data preservation, podcast constraints and old radio writes passed (PostgreSQL ${version})`);
    } finally {
      await client.end();
      await admin`drop database ${admin(name)}`;
    }
  }
} finally { await admin.end(); await rm(scratch, { recursive: true, force: true }); }
