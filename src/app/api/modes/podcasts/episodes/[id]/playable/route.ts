import { requirePodcastUser,podcastId } from '@/lib/modes/podcasts/http';
import { withApiLogging } from '@/lib/server/logging/api';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
import { resolveEpisode } from '@/lib/modes/podcasts/episode';
export const POST=withApiLogging('api.podcasts.playable',async(request:Request,{params}:Context)=>{await requirePodcastUser();return Response.json(await resolveEpisode(podcastId((await params).id),request.signal));},{noStore:true});
