import 'server-only';
import { sql, type SQL } from 'drizzle-orm';
import { getDb, type BlomoonDb } from '@/db';
import { AdminError } from '@/lib/admin/access';
import type { TerraPointDetail, TerraPointPage } from '../types';
import { normalizeDiscoveryText, type DiscoveryInput } from './discoveryInput';

export const podcastSource = { name: 'Curated podcasts', url: '', attribution: 'Publisher attribution appears on each show.', lastUpdated: '' };
const fold = (value: SQL) => sql`lower(regexp_replace(translate(normalize(${value}, NFKC),'يىك','ییک'),'[ـً-ٰٟ‌‍]','','g'))`;
const allowed = sql`s.enabled and s.last_success is not null and not exists(select 1 from media_blocks b where b.mode_id='podcasts' and b.point_id=m.id)`;
const joins = sql`from podcast_shows p join media_items m on m.id=p.media_item_id join podcast_feeds f on f.show_id=m.id join ingestion_sources s on s.id=f.source_id`;
const fields = sql`m.id,m.name,m.summary,m.latitude,m.longitude,m.location_precision,m.country_code,m.provider_metadata,p.language,f.attribution,s.enabled,s.last_success,
  not exists(select 1 from media_blocks b where b.mode_id='podcasts' and b.point_id=m.id) as unblocked`;
type Row = Record<string, unknown>;
function point(r: Row): TerraPointDetail {
  const metadata = r.provider_metadata as Record<string, string | null>;
  const success = r.last_success ? new Date(String(r.last_success)).toISOString() : null;
  return { id: String(r.id), modeId:'podcasts', kind:'show', name:String(r.name), summary:String(r.summary).replace(/<[^>]*>/g,'').slice(0,2000),
    latitude:r.latitude as number|null,longitude:r.longitude as number|null, locationPrecision:r.location_precision as 'verified'|null,
    countryCode:r.country_code as string|undefined, timestamp:success ?? undefined,
    availability:{status:r.enabled && r.unblocked ? 'unverified':'unavailable',lastVerifiedAt:null},
    fields:[{label:'Language',value:String(r.language ?? 'Unknown')},{label:'Topics',value:metadata.topics || 'Unspecified'},
      {label:'Attribution',value:String(r.attribution)},{label:'Author',value:metadata.author || 'Unknown'}, {label:'Copyright / licence',value:metadata.copyright || 'See publisher attribution'},
      {label:'Catalog freshness',value:!success ? 'Awaiting first ingestion' : Date.now()-Date.parse(success)>172800000 ? 'Stale — showing last known catalog' : 'Recently refreshed'},
      {label:'Last refresh',value:success ?? 'Never'}] };
}
export async function podcastPage(input: DiscoveryInput, db: BlomoonDb = getDb()): Promise<TerraPointPage> {
  const {q,language,topic,countryCode,limit,offset,pageToken}=input;
  const contains=(field:SQL,value:string)=>sql`strpos(${fold(field)},${normalizeDiscoveryText(value)})>0`;
  const where=sql`${allowed} and ${contains(sql`m.name || ' ' || m.summary`,q)}
    and (${!language} or ${fold(sql`coalesce(p.language,'')`)}=${normalizeDiscoveryText(language)}
      or starts_with(${fold(sql`coalesce(p.language,'')`)},${normalizeDiscoveryText(language)+'-'})) and ${contains(sql`coalesce(m.provider_metadata->>'topics','')`,topic)}
    ${countryCode ? sql`and m.country_code=${countryCode}`:sql``}`;
  return db.transaction(async tx=>{
    await tx.execute(sql`set local statement_timeout = '1500ms'`);
    const [state]=await tx.execute(sql`select count(*)::int as total,md5(coalesce(string_agg(m.id::text || m.updated_at::text || p.updated_at::text || m.name,'' order by m.id),'')) as token ${joins} where ${where}`);
    if(offset && (!pageToken || pageToken!==state.token)) throw new AdminError(409,'Catalog changed. Reload the list.');
    const rows=await tx.execute(sql`select ${fields} ${joins} where ${where} order by ${fold(sql`m.name`)} collate "C",m.id limit ${limit} offset ${offset}`);
    const total=Number(state.total);
    return {modeId:'podcasts',source:podcastSource,points:rows.map(point),limit,offset,total,totalKind:'exact',pageToken:String(state.token),nextOffset:offset+rows.length<total?offset+rows.length:null};
  },{isolationLevel:'repeatable read',accessMode:'read only'});
}
export async function podcastDetail(id:string,db:BlomoonDb=getDb()) {
  const [row]=await db.execute(sql`select ${fields} ${joins} where m.id=${id}::uuid`);
  return row ? point(row):null;
}
export async function podcastMarkers(db:BlomoonDb=getDb()) {
  const rows=await db.execute(sql`select ${fields} ${joins} where ${allowed} and m.location_precision='verified' and m.latitude is not null and m.longitude is not null order by m.id limit 500`);
  return {modeId:'podcasts',source:podcastSource,points:rows.map(point)};
}
export async function podcastEpisodes(id:string,input:DiscoveryInput,db:BlomoonDb=getDb(),userId?:string) {
  return db.transaction(async tx=>{
    await tx.execute(sql`set local statement_timeout = '1500ms'`);
    const [show]=await tx.execute(sql`select ${fields} ${joins} where m.id=${id}::uuid`);
    if(!show) throw new AdminError(404,'Show not found.');
    if(point(show).availability?.status==='unavailable') return {episodes:[],nextOffset:null,pageToken:'',unavailable:true};
    const where=sql`e.show_id=${id}::uuid and not exists(select 1 from media_blocks b where b.mode_id='podcasts' and b.point_id=m.id)`;
    const from=sql`from podcast_episodes e join media_items m on m.id=e.media_item_id where ${where}`;
    const [state]=await tx.execute(sql`select count(*)::int as total,md5(coalesce(string_agg(m.id::text || m.updated_at::text || e.updated_at::text || coalesce(e.published_at::text,''),'' order by m.id),'')) as token ${from}`);
    if(input.offset && input.pageToken!==state.token) throw new AdminError(409,'Episodes changed. Reload the list.');
    const episodes=await tx.execute(sql`select ${userId?sql`exists(select 1 from podcast_saves ps where ps.user_id=${userId}::uuid and ps.episode_id=m.id) as saved,
      (select position_seconds from podcast_listening pl where pl.user_id=${userId}::uuid and pl.episode_id=m.id) as "positionSeconds",
      (select completed from podcast_listening pl where pl.user_id=${userId}::uuid and pl.episode_id=m.id) as completed,`:sql``} m.id,m.name,left(regexp_replace(e.description,'<[^>]*>','','g'),2000) as description,e.published_at as "publishedAt",e.duration_seconds as "durationSeconds",e.explicit,m.provider_metadata->>'author' as author,m.provider_metadata->>'copyright' as copyright ${from} order by e.published_at desc nulls last,e.media_item_id limit ${input.limit} offset ${input.offset}`);
    return {episodes,nextOffset:input.offset+episodes.length<Number(state.total)?input.offset+episodes.length:null,pageToken:String(state.token),unavailable:false};
  },{isolationLevel:'repeatable read',accessMode:'read only'});
}
