import { requirePodcastUser } from '@/lib/modes/podcasts/http';
import { withApiLogging } from '@/lib/server/logging/api';
import { podcastDetail } from '@/lib/modes/podcasts/discovery';
import { podcastId } from '@/lib/modes/podcasts/http';
export const dynamic='force-dynamic';
export const GET=withApiLogging('api.podcasts.detail',async(_request:Request,{params}:{params:Promise<{id:string}>})=>{
  await requirePodcastUser();const detail=await podcastDetail(podcastId((await params).id));
  return Response.json(detail ?? {error:'Show not found.'},{status:detail?200:404});
},{noStore:true});
