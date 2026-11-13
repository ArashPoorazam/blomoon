import { beforeEach,expect,it,vi } from 'vitest';
vi.mock('next/server',()=>({after:vi.fn()}));
vi.mock('@/lib/server/logging',()=>({logger:{info:vi.fn(),warn:vi.fn()}}));
vi.mock('@/lib/admin/events',()=>({recordApiFailure:vi.fn()}));
vi.mock('@/lib/admin/settings',()=>({getSettings:vi.fn(),getModeSettings:vi.fn()}));
vi.mock('@/lib/auth/server',()=>({requireUser:vi.fn(),getOptionalUser:vi.fn(),hasCompletedAuthentication:vi.fn()}));
vi.mock('@/lib/server/responses',()=>({apiError:(e:{status?:number;message:string})=>Response.json({error:e.message},{status:e.status??500})}));
vi.mock('@/lib/modes/podcasts/discovery',()=>({podcastPage:vi.fn(),podcastDetail:vi.fn(),podcastMarkers:vi.fn(),podcastEpisodes:vi.fn()}));
import { getSettings,getModeSettings } from '@/lib/admin/settings';
import { requireUser,hasCompletedAuthentication } from '@/lib/auth/server';
import { AdminError } from '@/lib/admin/access';
import { podcastPage,podcastDetail,podcastMarkers,podcastEpisodes } from '@/lib/modes/podcasts/discovery';
import { GET as search } from './search/route';
import { GET as markers } from './points/route';
import { GET as detail } from './points/[id]/route';
import { GET as episodes } from './points/[id]/episodes/route';
const routes=[search,markers,detail,episodes];
const context={params:Promise.resolve({id:'22222222-2222-4222-8222-222222222222'})};
const request=()=>new Request('http://localhost/api/modes/podcasts/search');
beforeEach(()=>{
 vi.resetAllMocks();vi.mocked(getSettings).mockResolvedValue({maintenance:false} as never);
 vi.mocked(getModeSettings).mockResolvedValue({enabled:true,version:0});
 vi.mocked(requireUser).mockResolvedValue({id:'user',emailVerified:true} as never);
 vi.mocked(hasCompletedAuthentication).mockResolvedValue(true);
});
it('guards every podcast route against disabled modes, maintenance, missing sessions and incomplete authentication',async()=>{
 for(const handler of routes){
   vi.mocked(getModeSettings).mockResolvedValueOnce({enabled:false,version:1});expect((await handler(request(),context)).status).toBe(503);
   vi.mocked(getSettings).mockResolvedValueOnce({maintenance:true} as never);expect((await handler(request(),context)).status).toBe(503);
   vi.mocked(requireUser).mockRejectedValueOnce(new AdminError(401,'Sign in'));expect((await handler(request(),context)).status).toBe(401);
   vi.mocked(hasCompletedAuthentication).mockResolvedValueOnce(false);expect((await handler(request(),context)).status).toBe(403);
 }
 for(const query of [podcastPage,podcastDetail,podcastMarkers,podcastEpisodes])expect(query).not.toHaveBeenCalled();
});
it('rejects invalid inputs and returns private no-store results',async()=>{
 expect((await search(new Request('http://localhost/api/modes/podcasts/search?limit=5000'),context)).status).toBe(400);
 expect((await detail(request(),{params:Promise.resolve({id:'invalid'})})).status).toBe(404);
 vi.mocked(podcastPage).mockResolvedValue({points:[]} as never);
 const response=await search(request(),context);expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
});
