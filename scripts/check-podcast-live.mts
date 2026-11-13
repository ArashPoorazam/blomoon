/** Normal-volume live requests; database work is limited to an explicitly disposable local PG17 DB. */
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { setTimeout as delay } from 'node:timers/promises';
import { createPodcastIndex } from '../src/lib/modes/podcasts/directory';
import { approvedPodcastSources } from '../src/lib/modes/podcasts/approvedSources';
import { createIngestionStore } from '../src/lib/ingestion/store';
import { runIsolatedFetch } from '../src/lib/ingestion/isolation';
import { applyPodcastFeed, bindCuratedFeed } from '../src/lib/modes/podcasts/catalog';
import { linkDirectoryShow } from '../src/lib/modes/podcasts/directoryIdentity';

if(process.env.P06_LIVE_DISPOSABLE!=='1')throw new Error('Explicit live/disposable opt-in required');
const url=new URL(process.env.P06_TEST_DATABASE_URL!);
if(!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.startsWith('/blomoon_p06_live_'))throw new Error('Use a disposable local blomoon_p06_live_* database');
const db=postgres(url.href,{max:3,onnotice:()=>{}}),store=createIngestionStore(db),directory=createPodcastIndex();
try {
  const [version]=await db`select current_setting('server_version_num')::int as v`;assert(version.v>=170000&&version.v<180000);
  assert.equal((await db`select count(*)::int as count from ingestion_sources`)[0].count,0,'Use a freshly migrated disposable database');
  for(const approved of approvedPodcastSources.filter(source => !process.argv.includes('--linux-only') || source.name === 'LINUX Unplugged')){
    const sourceId=await store.configureSource({id:approved.id,kind:'feed',url:approved.url,origins:[...approved.origins]});
    const showId=await bindCuratedFeed(db,sourceId,approved.provenance,approved.attribution);
    let initialIds:string[]=[];
    for(let pass=0;pass<2;pass++){
      await store.enqueue(sourceId,`live:${Date.now()}:${pass}`);const job=(await store.claim())!;assert.equal(job.source_id,sourceId);
      const result=await runIsolatedFetch(job.source,store,AbortSignal.timeout(50_000));
      await store.complete(job,result,applyPodcastFeed);
      const episodes=await db`select media_item_id from podcast_episodes where show_id=${showId} order by media_item_id`;
      const ids=episodes.map(e=>e.media_item_id as string);assert(ids.length>0);
      if(pass===0)initialIds=ids;else assert.deepEqual(ids,initialIds);
      console.log(JSON.stringify({source:approved.name,pass:pass+1,status:result.status,bytes:result.bytes,episodes:ids.length,finalOrigin:new URL(result.finalUrl).origin}));
      await delay(1200);
    }
    const candidates=await directory.search(approved.name);
    const aliases=await db`select url from podcast_feed_aliases where source_id=${sourceId}`;
    const candidate=candidates.find(c=>aliases.some(a=>a.url===c.feedUrl));
    assert(candidate,`No verified feed match for ${approved.name}`);
    await delay(1200);
    const lookedUp=await directory.lookup(candidate.providerKey);
    assert(lookedUp.some(c=>c.providerKey===candidate.providerKey&&c.feedUrl===candidate.feedUrl));
    assert.equal(await linkDirectoryShow(db,sourceId,candidate),showId);
    assert.equal(await linkDirectoryShow(db,sourceId,candidate),showId);
    console.log(JSON.stringify({source:approved.name,directoryKey:candidate.providerKey,searchLookupAndStableAlias:'passed'}));
    await delay(1200);
  }
} finally {await db.end();}
