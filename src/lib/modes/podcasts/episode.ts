import 'server-only';
import { sql } from 'drizzle-orm';
import { getDb, type BlomoonDb } from '@/db';
import { AdminError } from '@/lib/admin/access';
import { approvedUrl, resolvePublicAddress } from '@/lib/ingestion/address';
import { playbackDescriptorSchema } from '../playback/descriptor';
import type { TerraPointDetail } from '../types';

export async function episodeDetail(id:string, db:BlomoonDb=getDb()):Promise<TerraPointDetail> {
  const [row]=await db.execute(sql`select m.id,m.name,e.show_id,sm.name as show_name,
    s.enabled and s.last_success is not null and not exists(select 1 from media_blocks b where b.mode_id='podcasts' and b.point_id in (m.id,sm.id)) as eligible
    from podcast_episodes e join media_items m on m.id=e.media_item_id join media_items sm on sm.id=e.show_id
    join podcast_feeds f on f.show_id=e.show_id join ingestion_sources s on s.id=f.source_id where e.media_item_id=${id}::uuid`);
  if(!row)throw new AdminError(404,'Episode not found.');
  return {id,modeId:'podcasts',kind:'episode',name:String(row.name),summary:String(row.show_name),latitude:null,longitude:null,
    metrics:{showId:String(row.show_id)},fields:[],availability:{status:row.eligible?'unverified':'disabled',lastVerifiedAt:null}};
}
export async function requireEpisode(id:string,db:BlomoonDb=getDb()) {
  const detail=await episodeDetail(id,db);
  if(detail.availability?.status==='disabled')throw new AdminError(403,'This episode or its show is unavailable.');
  return detail;
}
export async function resolveEpisode(id:string,signal:AbortSignal,db:BlomoonDb=getDb()) {
  await requireEpisode(id,db);
  const rows=await db.execute(sql`select url,mime from podcast_enclosures where episode_id=${id}::uuid and active and mime like 'audio/%' order by updated_at desc,url limit 1`);
  if(!rows.length)throw new AdminError(404,'No supported audio enclosure.');
  // Validate only catalog identities; never fetch/relay a client-supplied media URL.
  const raw=String(rows[0].url);
  try {
    const url=approvedUrl(raw,[new URL(raw).origin]);
    await resolvePublicAddress(url,AbortSignal.any([signal,AbortSignal.timeout(5000)]));
  } catch {throw new AdminError(422,'The publisher audio address is unavailable or unsupported.');}
  return playbackDescriptorSchema.parse({version:1,modeId:'podcasts',pointId:id,mediaKind:'audio',timeline:'on-demand',expiresAt:null,
    controls:{pause:true,seek:true,rate:true},sources:[{url:raw,transport:'direct',contentType:String(rows[0].mime)}]});
}
