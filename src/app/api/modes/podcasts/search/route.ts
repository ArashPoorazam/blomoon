import { requirePodcastUser } from '@/lib/modes/podcasts/http';
import { withApiLogging } from '@/lib/server/logging/api';
import { podcastPage } from '@/lib/modes/podcasts/discovery';
import { podcastInput } from '@/lib/modes/podcasts/http';
export const dynamic='force-dynamic';
export const GET=withApiLogging('api.podcasts.search',async(request:Request)=>{
  await requirePodcastUser();return Response.json(await podcastPage(podcastInput(request)));
},{noStore:true});
