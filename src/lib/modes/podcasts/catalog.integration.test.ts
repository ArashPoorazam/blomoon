import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createIngestionStore } from '../../ingestion/store';
import { assertIngestionRole } from '../../ingestion/role';
import { parseXml } from '../../ingestion/xml';
import { applyPodcastFeed, bindCuratedFeed, podcastIngestionStatus } from './catalog';
import { rss, item } from './fixtures';
import { linkDirectoryShow } from './directoryIdentity';
const enabled = process.env.PODCAST_INTEGRATION === '1';
const url = enabled ? new URL(process.env.DATABASE_URL!) : null;
if (url && (!['localhost','127.0.0.1','[::1]'].includes(url.hostname) || !url.pathname.startsWith('/blomoon_p06_'))) throw new Error('Disposable local blomoon_p06_* database required');
const db = enabled ? postgres(url!.href,{max:4,prepare:false,onnotice:()=>{}}) : null;
const store = enabled ? createIngestionStore(db!) : null;
let sourceId: string;
let showId: string;
async function publish(xml = rss(), finalUrl = 'https://feeds.example/a', client = db!) {
  const worker = createIngestionStore(client);
  await worker.enqueue(sourceId, randomUUID());
  const job = (await worker.claim())!;
  await worker.complete(job,{status:'modified',finalUrl,etag:'v1',lastModified:null,bytes:1,document:parseXml(Buffer.from(xml))},applyPodcastFeed);
}
describe.skipIf(!enabled)('podcast catalog on disposable PostgreSQL 17', () => {
  beforeAll(async () => {
    const [v] = await db!`select current_setting('server_version_num')::int as version`;
    expect(v.version).toBeGreaterThanOrEqual(170000);expect(v.version).toBeLessThan(180000);
  });
  beforeEach(async () => {
    await db!`truncate podcast_enclosures,podcast_episodes,podcast_feed_aliases,podcast_feeds,podcast_shows,ingestion_sources cascade`;
    await db!`delete from media_identity_aliases where mode_id='podcasts'`;
    await db!`delete from media_items where mode_id='podcasts'`;
    sourceId = await store!.configureSource({kind:'feed',url:'https://feeds.example/a',origins:['https://feeds.example']});
    showId = await bindCuratedFeed(db!,sourceId,'Synthetic fixture, no publisher approval','Fixture author');
  });
  afterAll(async () => { await db?.end(); });
  it('is idempotent, retains omitted episodes, updates enclosure URLs without losing saved state', async () => {
    await publish(rss(item()+item('two','https://cdn.example/two.mp3')));
    const before = await db!`select media_item_id from podcast_episodes order by identity_key`;
    const user = randomUUID();await db!`insert into users(id,email) values (${user},${`${user}@example.test`})`;
    const episodeId = before[0].media_item_id;
    await db!`insert into user_saved_media_items(user_id,media_item_id) values (${user},${episodeId})`;
    await db!`insert into user_playback_history(user_id,media_item_id,played_on) values (${user},${episodeId},'2026-11-13')`;
    await publish(rss(item()+item('two','https://cdn.example/two.mp3')));
    await publish(rss(item('one','https://cdn.example/changed.mp3').replace('Episode','Correction')));
    expect(await db!`select media_item_id from podcast_episodes order by identity_key`).toEqual(before);
    expect(await db!`select * from user_saved_media_items where user_id=${user}`).toHaveLength(1);
    expect(await db!`select * from user_playback_history where user_id=${user}`).toHaveLength(1);
    expect(await db!`select * from podcast_enclosures where active`).toHaveLength(2);
    expect(await db!`select * from podcast_enclosures where not active`).toHaveLength(1);
    expect((await podcastIngestionStatus(db!))[0].last_success).toBeTruthy();
    await db!`delete from users where id=${user}`;
  });
  it('preserves identity through approved redirects and operator-configured feed migrations', async () => {
    await publish();const before = await db!`select media_item_id from podcast_episodes`;
    await store!.configureSource({id:sourceId,kind:'feed',url:'https://feeds.example/new',origins:['https://feeds.example']});
    expect(await bindCuratedFeed(db!,sourceId,'retained','retained')).toBe(showId);
    await publish(rss(),'https://feeds.example/final');
    expect(await db!`select media_item_id from podcast_episodes`).toEqual(before);
    expect(await db!`select * from podcast_feed_aliases where source_id=${sourceId}`).toHaveLength(3);
    expect((await db!`select latitude,longitude from media_items where id=${showId}`)[0]).toEqual({latitude:null,longitude:null});
  });
  it('rolls back malformed feed updates and rejects alias collisions without merging shows', async () => {
    await publish();const before=await db!`select * from podcast_episodes`;
    await expect(publish(rss(item()+item('one','https://cdn.example/conflict.mp3')))).rejects.toMatchObject({code:'invalid_xml'});
    expect(await db!`select * from podcast_episodes`).toEqual(before);
    await db!`update ingestion_jobs set status='failed',lease_token=null,lease_until=null where status='running'`;
    const other = await store!.configureSource({kind:'feed',url:'https://feeds.example/a',origins:['https://feeds.example']});
    await expect(bindCuratedFeed(db!,other,'fixture','fixture')).rejects.toMatchObject({code:'source_changed'});
    expect(await db!`select * from podcast_shows`).toHaveLength(1);
  });
  it('keeps a healthy catalog on 304 and rejects stale workers before writes',async()=>{
    await publish();await store!.enqueue(sourceId,'conditional');const job=(await store!.claim())!;
    await store!.complete(job,{status:'not_modified',document:null,finalUrl:'https://feeds.example/a',bytes:0,etag:null,lastModified:null},applyPodcastFeed);
    expect(await db!`select * from podcast_episodes`).toHaveLength(1);
    await store!.enqueue(sourceId,'stale');const stale=(await store!.claim())!;
    await db!`update ingestion_jobs set lease_until=clock_timestamp()-interval '1 second' where id=${stale.id}`;
    await expect(store!.complete(stale,{status:'modified',document:parseXml(Buffer.from(rss('', 'Wrong'))),finalUrl:'https://feeds.example/a',bytes:0,etag:null,lastModified:null},applyPodcastFeed)).rejects.toMatchObject({code:'lease_lost'});
    expect((await db!`select name from media_items where id=${showId}`)[0].name).toBe('Show');
  });
  it('separates identical GUIDs between shows and enforces domain kinds',async()=>{
    await publish();const first = sourceId;
    sourceId=await store!.configureSource({kind:'feed',url:'https://feeds.example/other',origins:['https://feeds.example']});
    await bindCuratedFeed(db!,sourceId,'fixture','fixture');await publish(rss(),'https://feeds.example/other');
    expect(await db!`select * from podcast_episodes`).toHaveLength(2);
    await expect(db!`insert into podcast_episodes(media_item_id,show_id,identity_key) values (${showId},${showId},'invalid')`).rejects.toMatchObject({code:'23514'});
    expect(first).not.toBe(sourceId);
  });
  it('links directory identity only to verified feed aliases without changing the canonical show',async()=>{
    await publish();
    const candidate={provider:'podcast-index' as const,providerKey:'apple:123',title:'Directory title',author:'Author',feedUrl:'https://feeds.example/a',attribution:'Podcast Index' as const};
    expect(await linkDirectoryShow(db!,sourceId,candidate)).toBe(showId);
    expect(await linkDirectoryShow(db!,sourceId,candidate)).toBe(showId);
    await expect(linkDirectoryShow(db!,sourceId,{...candidate,feedUrl:'https://other.example/feed'})).rejects.toThrow('verified');
    const other=await store!.configureSource({kind:'feed',url:'https://feeds.example/other',origins:['https://feeds.example']});
    await bindCuratedFeed(db!,other,'fixture','fixture');
    await expect(linkDirectoryShow(db!,other,{...candidate,feedUrl:'https://feeds.example/other'})).rejects.toThrow('another show');
    expect((await db!`select name from media_items where id=${showId}`)[0].name).toBe('Show');
  });
  it('publishes under a scoped role while denying accounts, radio writes and source curation', async () => {
    const suffix=randomUUID().replaceAll('-','');const base=`p06_base_${suffix}`,group=`p06_group_${suffix}`,login=`p06_login_${suffix}`;
    await db!.unsafe((await readFile('scripts/ingestion-role.sql','utf8')).replaceAll('blomoon_ingestion',base));
    await db!.unsafe((await readFile('scripts/podcast-ingestion-role.sql','utf8')).replaceAll('blomoon_podcast_ingestion',group).replaceAll('blomoon_ingestion',base));
    await db!`create role ${db!(login)} login`;await db!`grant ${db!(group)} to ${db!(login)}`;
    const connection=new URL(url!);connection.username=login;const restricted=postgres(connection.href,{max:2,prepare:false,onnotice:()=>{}});
    try {
      await assertIngestionRole(restricted,true);
      await expect(assertIngestionRole(restricted)).rejects.toThrow('restricted');
      await expect(restricted`select * from users`).rejects.toMatchObject({code:'42501'});
      await expect(restricted`update ingestion_sources set url='https://bad.example/feed'`).rejects.toMatchObject({code:'42501'});
      await expect(restricted`update media_items set star_count=100`).rejects.toMatchObject({code:'42501'});
      expect(await restricted`update media_items set name='bad' where mode_id='radio' returning id`).toHaveLength(0);
      await publish(rss(),'https://feeds.example/a',restricted);
      await publish(rss(item('one','https://cdn.example/update.mp3')),'https://feeds.example/a',restricted);
      expect(await restricted`select * from podcast_episodes`).toHaveLength(1);
    } finally {
      await restricted.end();await db!`drop role ${db!(login)}`;
      await db!`drop owned by ${db!(group)}`;await db!`drop role ${db!(group)}`;
      await db!`drop owned by ${db!(base)}`;await db!`drop role ${db!(base)}`;
    }
  });
});
