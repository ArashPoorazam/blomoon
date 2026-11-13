import { requirePodcastUser } from '@/lib/modes/podcasts/http';
import { withApiLogging } from '@/lib/server/logging/api';
import { podcastMarkers } from '@/lib/modes/podcasts/discovery';
export const dynamic='force-dynamic';
export const GET=withApiLogging('api.podcasts.markers',async()=>{
  await requirePodcastUser();return Response.json(await podcastMarkers());
},{noStore:true});
