import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'node:crypto';
import { afterAll,beforeEach,describe,expect,it,vi } from 'vitest';
import * as schema from '@/db/schema';
import { createIngestionStore } from '../../ingestion/store';
import { parseXml } from '../../ingestion/xml';
import { applyPodcastFeed,bindCuratedFeed } from './catalog';
import { rss,item } from './fixtures';
import { readListening,beginListening,saveListening } from './listening';
import { changeLibrary,readLibrary } from './library';
import { episodeDetail,resolveEpisode } from './episode';
import { podcastEpisodes } from './discovery';
import { discoveryInput } from './discoveryInput';
vi.mock('@/lib/ingestion/address',async()=>({...await vi.importActual('@/lib/ingestion/address'),resolvePublicAddress:vi.fn(async()=>({address:'1.1.1.1'}))}));
const enabled=process.env.PODCAST_LISTENING_INTEGRATION==='1';
const url=enabled?new URL(process.env.DATABASE_URL!):null;
if(url&&(!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.startsWith('/blomoon_p08_')))throw new Error('Disposable local blomoon_p08_* database required');
const client=enabled?postgres(url!.href,{max:4,prepare:false,onnotice:()=>{}}):null;
// Separate clients: Drizzle configures JSON serializers incompatible with the raw ingestion store.
const reader=enabled?postgres(url!.href,{max:4,prepare:false,onnotice:()=>{}}):null;
const db=reader?drizzle(reader,{schema}):null;
let showId:string,episodeId:string,sourceId:string,user:string,other:string;
async function publish(xml=rss(item())) {
 const store=createIngestionStore(client!);await store.enqueue(sourceId,randomUUID());const job=(await store.claim())!;
 await store.complete(job,{status:'modified',finalUrl:'https://feeds.example/a',etag:null,lastModified:null,bytes:1,document:parseXml(Buffer.from(xml))},applyPodcastFeed);
}
describe.skipIf(!enabled)('podcast listening PostgreSQL 17',()=>{
 beforeEach(async()=>{
  await client!`truncate podcast_enclosures,podcast_episodes,podcast_feed_aliases,podcast_feeds,podcast_shows,ingestion_sources cascade`;
  await client!`delete from media_identity_aliases where mode_id='podcasts'`;await client!`delete from media_blocks where mode_id='podcasts'`;await client!`delete from media_items where mode_id='podcasts'`;
  sourceId=await createIngestionStore(client!).configureSource({kind:'feed',url:'https://feeds.example/a',origins:['https://feeds.example']});
  showId=await bindCuratedFeed(client!,sourceId,'Fixture only','Publisher credit');await publish();
  episodeId=(await client!`select media_item_id from podcast_episodes`)[0].media_item_id;
  user=randomUUID();other=randomUUID();for(const id of [user,other])await client!`insert into users(id,email) values (${id},${`${id}@example.test`})`;
 });
 afterAll(async()=>{await client?.end();await reader?.end();});
 it('isolates accounts, keeps follows separate from saves and supplies saved/progress episode fields',async()=>{
  await changeLibrary(user,{kind:'follow',id:showId,enabled:true},db!);
  await changeLibrary(user,{kind:'save',id:episodeId,enabled:true},db!);await changeLibrary(user,{kind:'save',id:episodeId,enabled:true},db!);
  expect((await readLibrary(user,'follow',0,db!)).items).toHaveLength(1);expect((await readLibrary(user,'save',0,db!)).items).toHaveLength(1);
  expect((await readLibrary(other,'save',0,db!)).items).toHaveLength(0);
  await changeLibrary(other,{kind:'save',id:episodeId,enabled:false},db!);
  expect((await readLibrary(user,'save',0,db!)).items).toHaveLength(1);
  expect((await podcastEpisodes(showId,discoveryInput.parse({}),db!,user)).episodes[0].saved).toBe(true);
  expect((await podcastEpisodes(showId,discoveryInput.parse({}),db!,other)).episodes[0].saved).toBe(false);
  await expect(changeLibrary(user,{kind:'follow',id:episodeId,enabled:true},db!)).rejects.toMatchObject({status:404});
 });
 it('accepts rewinds and completion, ignores duplicate/reordered writes and rejects another user/session',async()=>{
  const sessionId=randomUUID();await beginListening(user,episodeId,{sessionId,expectedVersion:0},db!);
  await saveListening(user,episodeId,{sessionId,sequence:2,positionSeconds:100,completed:false},db!);
  await saveListening(user,episodeId,{sessionId,sequence:1,positionSeconds:10,completed:false},db!);
  expect((await readListening(user,episodeId,db!)).positionSeconds).toBe(100);
  await saveListening(user,episodeId,{sessionId,sequence:3,positionSeconds:20,completed:false},db!);
  expect((await readListening(user,episodeId,db!)).positionSeconds).toBe(20);
  await saveListening(user,episodeId,{sessionId,sequence:4,positionSeconds:120,completed:true},db!);
  await saveListening(user,episodeId,{sessionId,sequence:4,positionSeconds:0,completed:false},db!);
  expect((await readListening(user,episodeId,db!)).completed).toBe(true);
  await expect(saveListening(other,episodeId,{sessionId,sequence:5,positionSeconds:0,completed:false},db!)).rejects.toMatchObject({status:409});
  expect((await readListening(other,episodeId,db!)).positionSeconds).toBe(0);
 });
 it('serializes competing devices, supports acquisition retries, and rejects delayed older acquisitions/writes',async()=>{
  const ids=[randomUUID(),randomUUID()];
  const results=await Promise.allSettled(ids.map(sessionId=>beginListening(user,episodeId,{sessionId,expectedVersion:0},db!)));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  const active=await readListening(user,episodeId,db!);const sessionId=String(active.sessionId);
  expect((await beginListening(user,episodeId,{sessionId,expectedVersion:0},db!)).version).toBe(1);
  await saveListening(user,episodeId,{sessionId,sequence:10,positionSeconds:42,completed:false},db!);
  const newer=randomUUID();expect((await beginListening(user,episodeId,{sessionId:newer,expectedVersion:1},db!)).positionSeconds).toBe(42);
  await expect(beginListening(user,episodeId,{sessionId,expectedVersion:0},db!)).rejects.toMatchObject({status:409});
  await expect(saveListening(user,episodeId,{sessionId,sequence:11,positionSeconds:99,completed:false},db!)).rejects.toMatchObject({status:409});
  expect((await readListening(user,episodeId,db!)).positionSeconds).toBe(42);
 });
 it('retains progress/saves after enclosure changes and rolling feeds, denies blocked/disabled playback',async()=>{
  const sessionId=randomUUID();await beginListening(user,episodeId,{sessionId,expectedVersion:0},db!);
  await saveListening(user,episodeId,{sessionId,sequence:1,positionSeconds:55,completed:false},db!);
  await changeLibrary(user,{kind:'save',id:episodeId,enabled:true},db!);
  await publish(rss(item('one','https://cdn.example/changed.mp3')));await publish(rss(''));
  expect((await readListening(user,episodeId,db!)).positionSeconds).toBe(55);
  expect((await resolveEpisode(episodeId,new AbortController().signal,db!)).sources[0].url).toBe('https://cdn.example/changed.mp3');
  await client!`insert into media_blocks(key,mode_id,point_id,reason) values (${`podcasts:${showId}`},'podcasts',${showId},'fixture')`;
  expect((await episodeDetail(episodeId,db!)).availability?.status).toBe('disabled');
  await expect(resolveEpisode(episodeId,new AbortController().signal,db!)).rejects.toMatchObject({status:403});
  expect((await readLibrary(user,'save',0,db!)).items).toHaveLength(1);
  await client!`delete from media_blocks where point_id=${showId}`;
  await client!`update ingestion_sources set enabled=false where id=${sourceId}`;
  await expect(beginListening(user,episodeId,{sessionId:randomUUID(),expectedVersion:1},db!)).rejects.toMatchObject({status:403});
 });
 it('rejects non-episode playback and unsafe catalog enclosure URLs without proxying',async()=>{
  await expect(resolveEpisode(showId,new AbortController().signal,db!)).rejects.toMatchObject({status:404});
  await client!`update podcast_enclosures set url='http://127.0.0.1/private' where episode_id=${episodeId}`;
  await expect(resolveEpisode(episodeId,new AbortController().signal,db!)).rejects.toMatchObject({status:422});
 });
});
