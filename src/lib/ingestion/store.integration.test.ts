import { readFile } from "node:fs/promises";
import { assertIngestionRole } from "./role";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createIngestionStore, type IngestionJob } from "./store";
import type { FetchResult } from "./contracts";
const enabled=process.env.INGESTION_INTEGRATION==='1';
const connection=enabled ? new URL(process.env.DATABASE_URL!) : null;
if(connection && (!['127.0.0.1','localhost','[::1]'].includes(connection.hostname) || !connection.pathname.startsWith('/blomoon_p05_')))throw new Error('Ingestion tests require an explicitly disposable local blomoon_p05_* database');
const db=enabled ? postgres(connection!.href,{max:6,prepare:false,onnotice:()=>{}}) : null;
const store=enabled ? createIngestionStore(db!) : null;
const good:FetchResult={status:'modified',finalUrl:'https://feeds.example/a',etag:'"v1"',lastModified:null,bytes:6,document:{name:'rss',attributes:{},text:'last good',children:[]}};
async function source() {return store!.configureSource({kind:'feed',url:'https://feeds.example/a',origins:['https://feeds.example']});}
async function job() {const id=await source();await store!.enqueue(id,randomUUID());return (await store!.claim())!;}
async function expire(claim:IngestionJob) {await db!`update ingestion_jobs set lease_until=clock_timestamp()-interval '1 second' where id=${claim.id}`;}
describe.skipIf(!enabled)('durable ingestion on disposable PostgreSQL',()=>{
  beforeAll(async()=>{const [version]=await db!`select current_setting('server_version_num')::int as version`;expect(version.version).toBeGreaterThanOrEqual(170000);expect(version.version).toBeLessThan(180000);await db!`create table p05_catalog (id text primary key,value text not null)`;});
  beforeEach(async()=>{await db!`truncate ingestion_jobs,ingestion_documents,ingestion_sources,ingestion_host_slots,p05_catalog cascade`;});
  afterAll(async()=>{if(db){await db`drop table if exists p05_catalog`;await db.end();}});
  it('deduplicates simultaneous jobs and repeated deliveries without duplicate catalog effects',async()=>{
    const id=await source();const ids=await Promise.all(Array.from({length:8},()=>store!.enqueue(id,'same-key')));expect(new Set(ids).size).toBe(1);
    const claim=(await store!.claim())!;expect(await store!.claim()).toBeNull();
    await store!.complete(claim,good,async tx=>{await tx`insert into p05_catalog values ('a','one')`;});
    expect(await store!.enqueue(id,'same-key')).toBe(claim.id);
    await expect(store!.complete(claim,good,async tx=>{await tx`update p05_catalog set value='two'`;})).rejects.toMatchObject({code:'lease_lost'});
    expect((await db!`select value from p05_catalog`)[0].value).toBe('one');
  });
  it('reclaims crashed jobs, rejects expired heartbeats and fences old worker writes',async()=>{
    const first=await job();expect(await store!.heartbeat(first)).toBe(true);await expire(first);expect(await store!.heartbeat(first)).toBe(false);
    const next=(await store!.claim())!;expect(next.id).toBe(first.id);expect(next.lease_token).not.toBe(first.lease_token);expect(next.attempts).toBe(2);
    await expect(store!.complete(first,good)).rejects.toMatchObject({code:'lease_lost'});expect(await store!.fail(first,'network')).toBe(false);
    await store!.complete(next,good);expect((await db!`select document from ingestion_documents`)[0].document.text).toBe('last good');
  });
  it('rejects stale completion even before another worker has reclaimed the lease',async()=>{
    const claim=await job();await expire(claim);await expect(store!.complete(claim,good)).rejects.toMatchObject({code:'lease_lost'});
    expect((await db!`select * from ingestion_documents`)).toHaveLength(0);
  });
  it('rolls back catalog, validators and job completion together if apply fails or lease expires during apply',async()=>{
    const claim=await job();
    await expect(store!.complete(claim,good,async tx=>{await tx`insert into p05_catalog values ('a','bad')`;throw new Error('fixture failure');})).rejects.toThrow('fixture failure');
    expect(await db!`select * from p05_catalog`).toHaveLength(0);expect(await db!`select * from ingestion_documents`).toHaveLength(0);
    await expect(store!.complete(claim,good,async tx=>{await tx`insert into p05_catalog values ('b','bad')`;await tx`update ingestion_jobs set lease_until=clock_timestamp()-interval '1 second' where id=${claim.id}`;})).rejects.toMatchObject({code:'lease_lost'});
    expect(await db!`select * from p05_catalog`).toHaveLength(0);expect((await db!`select etag from ingestion_sources`)[0].etag).toBeNull();
  });
  it('bounds retry attempts, adds backoff and retains failed jobs for inspection',async()=>{
    let claim=await job();
    for(let attempt=1;attempt<=3;attempt++){
      expect(claim.attempts).toBe(attempt);expect(await store!.fail(claim,'network')).toBe(true);
      const [row]=await db!`select status,due_at>clock_timestamp() as delayed from ingestion_jobs where id=${claim.id}`;expect(row.delayed).toBe(true);
      if(attempt<3){expect(row.status).toBe('queued');expect(await store!.claim()).toBeNull();await db!`update ingestion_jobs set due_at=now()-interval '1 second' where id=${claim.id}`;claim=(await store!.claim())!;}
    }
    expect(await store!.claim()).toBeNull();const failed=await store!.failedJobs();expect(failed).toHaveLength(1);expect(failed[0].error_code).toBe('network');expect(failed[0]).not.toHaveProperty('url');expect(failed[0]).not.toHaveProperty('lease_token');
  });
  it('marks the third crashed attempt failed rather than leasing forever',async()=>{
    let claim=await job();for(let i=0;i<3;i++){await expire(claim);const next=await store!.claim();if(i<2)claim=next!;else expect(next).toBeNull();}
    expect((await store!.failedJobs())[0].attempts).toBe(3);
  });
  it('preserves last good data and validators through publisher/parser failure; 304 never empties the catalog',async()=>{
    const claim=await job();await store!.complete(claim,good);
    await store!.enqueue(claim.source_id,'second');const second=(await store!.claim())!;await store!.fail(second,'invalid_xml');
    expect((await db!`select document from ingestion_documents`)[0].document.text).toBe('last good');expect((await db!`select etag from ingestion_sources`)[0].etag).toBe('"v1"');
    await db!`update ingestion_jobs set due_at=clock_timestamp() where id=${second.id}`;const third=(await store!.claim())!;
    await store!.complete(third,{...good,status:'not_modified',document:null,etag:null});
    expect((await db!`select document from ingestion_documents`)[0].document.text).toBe('last good');expect((await db!`select etag from ingestion_sources`)[0].etag).toBe('"v1"');
  });
  it('invalidates in-flight results on source edits/disable without deleting last good data',async()=>{
    const claim=await job();await store!.complete(claim,good);await store!.enqueue(claim.source_id,'second');const pending=(await store!.claim())!;
    await store!.configureSource({id:claim.source_id,kind:'feed',url:'https://feeds.example/new',origins:['https://feeds.example'],enabled:false});
    expect(await store!.heartbeat(pending)).toBe(false);await expect(store!.complete(pending,good)).rejects.toMatchObject({code:'lease_lost'});
    expect(await db!`select * from ingestion_documents`).toHaveLength(1);await expect(store!.enqueue(claim.source_id,'third')).rejects.toMatchObject({code:'source_changed'});
  });
  it('enforces global concurrency and host slots across independent store clients; expired host slots recover',async()=>{
    for(let i=0;i<6;i++){const id=await source();await store!.enqueue(id,'one');}
    const results=await Promise.all(Array.from({length:6},()=>store!.claim()));expect(results.filter(Boolean)).toHaveLength(4);
    const other=createIngestionStore(db!);const tokens=await Promise.all([store!.acquireHost('feeds.example'),other.acquireHost('feeds.example'),other.acquireHost('feeds.example')]);expect(tokens.filter(Boolean)).toHaveLength(2);
    await store!.releaseHost(tokens.find(Boolean)!);expect(await other.acquireHost('feeds.example')).not.toBeNull();
    await db!`update ingestion_host_slots set expires_at=clock_timestamp()-interval '1 second'`;expect(await other.acquireHost('feeds.example')).not.toBeNull();
  });
  it('schedules due sources once with bounded jitter and respects disabled sources',async()=>{
    const id=await source();const counts=await Promise.all([store!.schedule(),store!.schedule()]);expect(counts.reduce((a,b)=>a+b,0)).toBe(1);
    expect(await store!.schedule()).toBe(0);expect(await db!`select * from ingestion_jobs`).toHaveLength(1);
    const [row]=await db!`select extract(epoch from next_run-clock_timestamp()) as seconds from ingestion_sources where id=${id}`;expect(Number(row.seconds)).toBeGreaterThan(3500);expect(Number(row.seconds)).toBeLessThanOrEqual(3960);
  });
  it('runs with a restricted DB role while denying accounts and source URL changes',async()=>{
    const suffix=randomUUID().replaceAll('-','');const group=`p05_group_${suffix}`,login=`p05_login_${suffix}`;
    const roleSql=(await readFile('scripts/ingestion-role.sql','utf8')).replaceAll('blomoon_ingestion',group);
    await db!.unsafe(roleSql);await db!`create role ${db!(login)} login`;await db!`grant ${db!(group)} to ${db!(login)}`;
    const url=new URL(connection!);url.username=login;const restricted=postgres(url.href,{max:2,prepare:false,onnotice:()=>{}});
    try {
      await assertIngestionRole(restricted);await expect(assertIngestionRole(db!)).rejects.toThrow('restricted');
      await expect(restricted`select * from users`).rejects.toMatchObject({code:'42501'});
      await expect(restricted`update ingestion_sources set url='https://unapproved.example/feed'`).rejects.toMatchObject({code:'42501'});
      const id=await source();const limited=createIngestionStore(restricted);await limited.enqueue(id,'limited');
      const claim=(await limited.claim())!;expect(await limited.heartbeat(claim)).toBe(true);
      const token=await limited.acquireHost('feeds.example');expect(token).not.toBeNull();await limited.releaseHost(token!);
      await limited.complete(claim,good);expect(await restricted`select * from ingestion_documents`).toHaveLength(1);
    } finally {
      await restricted.end();await db!`drop role ${db!(login)}`;await db!`drop owned by ${db!(group)}`;await db!`drop role ${db!(group)}`;
    }
  });

});
