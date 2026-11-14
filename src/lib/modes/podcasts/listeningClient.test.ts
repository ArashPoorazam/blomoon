import { afterEach,expect,it,vi } from 'vitest';
import { podcastListeningLifecycle } from './listeningClient';
import type { TerraPoint } from '../types';
const episode={id:'episode',kind:'episode',modeId:'podcasts'} as TerraPoint;
afterEach(()=>vi.unstubAllGlobals());
it('acquires with the observed version, resumes completed episodes at zero and sequences rewinds',async()=>{
 const writes:Record<string,unknown>[]=[];
 vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{
  if(init.method==='PUT')writes.push(JSON.parse(init.body));
  return Response.json(init.method==='POST'?{sequence:0,positionSeconds:50,completed:true}:{version:7});
 }));
 const session=(await podcastListeningLifecycle.prepare(episode,new AbortController().signal))!;
 expect(session.positionSeconds).toBe(0);
 session.save({positionSeconds:100,durationSeconds:120,rate:1},false);
 session.save({positionSeconds:20,durationSeconds:120,rate:1},false);
 session.save({positionSeconds:20,durationSeconds:120,rate:1},false);
 expect(writes.map(w=>[w.sequence,w.positionSeconds])).toEqual([[1,100],[2,20]]);
 const post=vi.mocked(fetch).mock.calls.find(([,init])=>init?.method==='POST')!;
 expect(JSON.parse(String(post[1]?.body)).expectedVersion).toBe(7);
 await vi.waitFor(()=>expect(session.error()).toBeNull());
});
it('surfaces takeover and network failures and stops stale writes',async()=>{
 const fetcher=vi.fn(async(_url,init)=>init.method==='PUT'?new Response('',{status:409}):Response.json({version:0,sequence:0,positionSeconds:9,completed:false}));
 vi.stubGlobal('fetch',fetcher);
 const session=(await podcastListeningLifecycle.prepare(episode,new AbortController().signal))!;
 session.save({positionSeconds:10,durationSeconds:100,rate:1},false);
 await vi.waitFor(()=>expect(session.error()).toContain('another device'));
 session.save({positionSeconds:20,durationSeconds:100,rate:1},false);
 expect(fetcher.mock.calls.filter(([,i])=>i.method==='PUT')).toHaveLength(1);
});
