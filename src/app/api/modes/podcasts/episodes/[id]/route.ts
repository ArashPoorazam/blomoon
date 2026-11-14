import { requirePodcastUser,podcastId } from '@/lib/modes/podcasts/http';
import { withApiLogging } from '@/lib/server/logging/api';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
import { episodeDetail } from '@/lib/modes/podcasts/episode';
export const GET=withApiLogging('api.podcasts.episode',async(_request:Request,{params}:Context)=>{await requirePodcastUser();return Response.json(await episodeDetail(podcastId((await params).id)));},{noStore:true});
