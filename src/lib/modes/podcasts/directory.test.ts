import { expect,it,vi } from 'vitest';
import { createPodcastIndex,normalizeDirectory } from './directory';
const row={kind:'podcast',trackId:123,trackName:'Example',artistName:'Author',feedUrl:'https://feeds.example/rss'};
const body=(rows:unknown[]=[row])=>Buffer.from(JSON.stringify({resultCount:rows.length,results:rows}));
it('normalizes compatibility IDs, filters unsafe/incomplete candidates and rejects conflicts',()=>{
  expect(normalizeDirectory(body())).toEqual([{provider:'podcast-index',providerKey:'apple:123',title:'Example',author:'Author',feedUrl:row.feedUrl,attribution:'Podcast Index'}]);
  expect(normalizeDirectory(body([{...row,feedUrl:'file:///etc/passwd'},null,{...row,trackId:-1}]))).toEqual([]);
  expect(()=>normalizeDirectory(body([row,{...row,feedUrl:'https://different.example/rss'}]))).toThrow('Conflicting');
  expect(()=>normalizeDirectory(Buffer.from('invalid'))).toThrow();
  expect(()=>normalizeDirectory(body(Array(101).fill(row)))).toThrow();
});
it('uses only fixed official paths; caches cloned results and validates search/lookup',async()=>{
  let time=0;const transport=vi.fn(async(_url:string)=>body());const client=createPodcastIndex(transport,()=>time);
  const results=await client.search('Hello & world');results[0].title='Changed';
  expect((await client.search('Hello & world'))[0].title).toBe('Example');expect(transport).toHaveBeenCalledTimes(1);
  expect(transport.mock.calls[0][0]).toBe('https://api.podcastindex.org/search?term=Hello+%26+world&limit=20');
  time=1001;await client.lookup('apple:123');expect(transport.mock.calls[1][0]).toContain('/lookup?id=123&entity=podcast');
  expect(()=>client.lookup('native:123')).toThrow();expect(()=>client.search('')).toThrow();
});
it('bounds concurrency and cools down errors without caching a failure',async()=>{
  let time=0;let finish!:(b:Buffer)=>void;const client=createPodcastIndex(()=>new Promise(resolve=>{finish=resolve;}),()=>time);
  const pending=client.search('one');await expect(client.search('two')).rejects.toThrow('unavailable');
  finish(Buffer.from('bad'));await expect(pending).rejects.toThrow('unavailable');
  time=59999;await expect(client.search('one')).rejects.toThrow('unavailable');
});
