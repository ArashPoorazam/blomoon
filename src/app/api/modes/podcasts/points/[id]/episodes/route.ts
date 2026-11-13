import { requirePodcastUser } from '@/lib/modes/podcasts/http';
import { withApiLogging } from '@/lib/server/logging/api';
import { podcastEpisodes } from '@/lib/modes/podcasts/discovery';
import { podcastId,podcastInput } from '@/lib/modes/podcasts/http';
export const dynamic='force-dynamic';
export const GET=withApiLogging('api.podcasts.episodes',async(request:Request,{params}:{params:Promise<{id:string}>})=>{
  await requirePodcastUser();return Response.json(await podcastEpisodes(podcastId((await params).id),podcastInput(request)));
},{noStore:true});
