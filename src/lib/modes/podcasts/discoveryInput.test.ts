import { expect,it } from 'vitest';
import { discoveryInput,normalizeDiscoveryText } from './discoveryInput';
import { podcastMode } from './mode';
it('bounds user queries and pagination',()=>{
 for(const input of [{limit:51},{offset:-1},{offset:20001},{q:'x'.repeat(121)},{countryCode:'Iran'},{pageToken:'x'.repeat(65)}])expect(discoveryInput.safeParse(input).success).toBe(false);
 expect(normalizeDiscoveryText('كِتاب يَك')).toBe('کتاب یک');
});
it('exposes language and quoted topic filters without sending provider requests',()=>{
 const url=new URL(podcastMode.listEndpoint({query:'science language:fa topic:"social science"',countryCode:null,limit:25,offset:25,sortId:'title',pageToken:'snapshot'}),'http://localhost');
 expect(Object.fromEntries(url.searchParams)).toEqual({q:'science',language:'fa',topic:'social science',limit:'25',offset:'25',pageToken:'snapshot'});
 expect(podcastMode.playback?.playableEndpoint("episode")).toBe("/api/modes/podcasts/episodes/episode/playable");
});
