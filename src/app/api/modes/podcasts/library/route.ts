import { z } from 'zod';
import { requirePodcastUser } from '@/lib/modes/podcasts/http';
import { withApiLogging } from '@/lib/server/logging/api';
import { AdminError } from '@/lib/admin/access';
import { libraryInput } from '@/lib/modes/podcasts/listeningInput';
import { changeLibrary,readLibrary,showLibrary } from '@/lib/modes/podcasts/library';
export const dynamic='force-dynamic';
export const GET=withApiLogging('api.podcasts.library.read',async(request:Request)=>{
  const user=await requirePodcastUser();
  const query=z.object({kind:z.enum(['follow','save','recent']).default('follow'),offset:z.coerce.number().int().min(0).max(100000).default(0),showId:z.uuid().optional()}).strict().safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!query.success)throw new AdminError(400,'Invalid library query.');
  return Response.json(query.data.showId?await showLibrary(user.id,query.data.showId):await readLibrary(user.id,query.data.kind,query.data.offset));
},{noStore:true});
export const PUT=withApiLogging('api.podcasts.library.change',async(request:Request)=>{
  const user=await requirePodcastUser();const input=libraryInput.safeParse(await request.json().catch(()=>null));
  if(!input.success)throw new AdminError(400,'Invalid library item.');
  await changeLibrary(user.id,input.data);return Response.json({ok:true});
},{noStore:true});
