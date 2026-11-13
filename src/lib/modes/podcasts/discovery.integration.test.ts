import postgres from 'postgres';
import { writeFile } from 'node:fs/promises';
import { drizzle } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import * as schema from '@/db/schema';
import { createIngestionStore } from '../../ingestion/store';
import { parseXml } from '../../ingestion/xml';
import { applyPodcastFeed, bindCuratedFeed } from './catalog';
import { rss,item } from './fixtures';
import { podcastDetail,podcastEpisodes,podcastMarkers,podcastPage } from './discovery';
import { discoveryInput } from './discoveryInput';
const enabled=process.env.PODCAST_INTEGRATION==='1';
const url=enabled?new URL(process.env.DATABASE_URL!):null;
if(url && (!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.startsWith('/blomoon_p06_')))throw new Error('Disposable local blomoon_p06_* database required');
const client=enabled?postgres(url!.href,{max:3,prepare:false,onnotice:()=>{}}):null;
const queries:{query:string;params:unknown[]}[]=[];
const reader=enabled?postgres(url!.href,{max:2,prepare:false}):null;
const db=reader?drizzle(reader,{schema,logger:{logQuery(query,params){queries.push({query,params});}}}):null;
let showId:string;
const input=(params:Record<string,unknown>={})=>discoveryInput.parse(params);
async function show(name:string) {
  const store=createIngestionStore(client!);
  const feedUrl=`https://fixture.example/${randomUUID()}`;
  const id=await store.configureSource({kind:'feed',url:feedUrl,origins:['https://fixture.example']});
  const show=await bindCuratedFeed(client!,id,'Fixture','Publisher credit');
  await store.enqueue(id,randomUUID());const job=(await store.claim())!;
  await store.complete(job,{status:'modified',finalUrl:feedUrl,etag:null,lastModified:null,bytes:1,document:parseXml(Buffer.from(rss(item('a')+item('b')+item('c'),name).replace('<language>','<category>Technology</category><language>')))},applyPodcastFeed);
  return show;
}
describe.skipIf(!enabled)('podcast discovery PostgreSQL 17',()=>{
  beforeEach(async()=>{
    await client!`truncate podcast_enclosures,podcast_episodes,podcast_feed_aliases,podcast_feeds,podcast_shows,ingestion_sources cascade`;
    await client!`delete from media_identity_aliases where mode_id='podcasts'`;
    await client!`delete from media_blocks where mode_id='podcasts'`;
    await client!`delete from media_items where mode_id='podcasts'`;
    showId=await show('كتاب يَك');
  });
  afterAll(async()=>{await client?.end({timeout:2});await reader?.end({timeout:2});});
  it('normalizes Persian/Arabic, supports language/topic/country and leaves unknown geography off the globe',async()=>{
    expect((await podcastPage(input({q:'کتاب یک',language:'FA',topic:'technology'}),db!)).points.map(p=>p.id)).toEqual([showId]);
    expect((await podcastPage(input({countryCode:'364'}),db!)).points).toEqual([]);
    expect((await podcastMarkers(db!)).points).toEqual([]);
    expect((await podcastPage(input({language:'f'}),db!)).points).toEqual([]);
    await client!`update podcast_shows set language='fa-IR' where media_item_id=${showId}`;
    expect((await podcastPage(input({language:'fa'}),db!)).points).toHaveLength(1);
    expect((await podcastPage(input({language:'ar'}),db!)).points).toEqual([]);
    const detail=await podcastDetail(showId,db!);
    expect(detail?.fields).toContainEqual({label:'Attribution',value:'Publisher credit'});
    expect(JSON.stringify(detail)).not.toContain('fixture.example');
  });
  it('pages tied titles and dates without duplicates, rejects shifted catalogs and keeps share identities',async()=>{
    await show('كتاب يَك');await show('كتاب يَك');
    const first=await podcastPage(input({limit:2}),db!);
    const second=await podcastPage(input({limit:2,offset:2,pageToken:first.pageToken}),db!);
    expect(new Set([...first.points,...second.points].map(p=>p.id)).size).toBe(3);
    const a=await podcastEpisodes(showId,input({limit:2}),db!);
    const b=await podcastEpisodes(showId,input({limit:2,offset:2,pageToken:a.pageToken}),db!);
    expect(new Set([...a.episodes,...b.episodes].map(e=>e.id)).size).toBe(3);
    await client!`update media_items set name='Changed',updated_at=clock_timestamp() where id=${showId}`;
    await expect(podcastPage(input({offset:2,pageToken:first.pageToken}),db!)).rejects.toMatchObject({status:409});
    expect((await podcastDetail(showId,db!))?.name).toBe('Changed');
    await client!`update podcast_episodes set published_at=clock_timestamp() where show_id=${showId}`;
    await expect(podcastEpisodes(showId,input({offset:2,pageToken:a.pageToken}),db!)).rejects.toMatchObject({status:409});
  });
  it('retains stale and disabled show detail while excluding disabled sources and blocked items',async()=>{
    await client!`update ingestion_sources set last_success=clock_timestamp()-interval '5 days'`;
    expect((await podcastDetail(showId,db!))?.fields.find(f=>f.label==='Catalog freshness')?.value).toContain('Stale');
    await client!`insert into media_blocks(key,mode_id,point_id,reason) values (${showId},'podcasts',${showId},'Fixture block')`;
    expect((await podcastPage(input(),db!)).points).toEqual([]);
    expect((await podcastDetail(showId,db!))?.availability?.status).toBe('unavailable');
    await client!`delete from media_blocks where point_id=${showId}`;
    await client!`update ingestion_sources set enabled=false`;
    expect((await podcastPage(input(),db!)).points).toEqual([]);
    expect((await podcastDetail(showId,db!))?.availability?.status).toBe('unavailable');
    expect((await podcastEpisodes(showId,input(),db!)).unavailable).toBe(true);
  });
  it('keeps episode responses bounded and measures actual query plans at 20,000 episodes',async()=>{
    for(let n=0;n<99;n++)await show(`Show ${n}`);
    await client!`insert into media_items(id,mode_id,kind,provider_id,provider_item_id,name,summary)
      select gen_random_uuid(),'podcasts','episode','podcasts-curated','scale:'||g,'Episode '||g,'' from generate_series(1,20000) g`;
    await client!`insert into podcast_episodes(media_item_id,show_id,identity_key,published_at)
      select id,${showId},provider_item_id,'2026-01-01'::timestamptz from media_items where provider_item_id like 'scale:%'`;
    await client!`analyze media_items`;await client!`analyze podcast_episodes`;
    queries.length=0;
    const page=await podcastEpisodes(showId,input(),db!);
    expect(page.episodes).toHaveLength(50);
    expect(JSON.stringify(page)).not.toContain('enclosure');
    await podcastPage(input({q:'کتاب'}),db!);await podcastMarkers(db!);
    const plans=[];
    for(const {query,params} of queries.filter(q=>q.query.trimStart().startsWith('select'))) {
      const plan=await client!.unsafe(`explain (analyze, buffers, format json) ${query}`,params as never[]);
      const result=plan[0]['QUERY PLAN'][0];
      plans.push({query,plan:result});
      expect(result['Execution Time']).toBeLessThan(1000);
    }
    expect(plans.length).toBeGreaterThanOrEqual(5);
    await writeFile('/tmp/p07-query-plans.json',JSON.stringify(plans,null,2));
  },60000);
});
