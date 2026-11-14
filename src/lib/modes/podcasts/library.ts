import 'server-only';
import { sql } from 'drizzle-orm';
import { getDb, type BlomoonDb } from '@/db';
import { AdminError } from '@/lib/admin/access';
import type { LibraryInput } from './listeningInput';
export async function changeLibrary(userId:string,input:LibraryInput,db:BlomoonDb=getDb()) {
  const table=sql.identifier(input.kind==='follow'?'podcast_follows':'podcast_saves');
  const column=sql.identifier(input.kind==='follow'?'show_id':'episode_id');
  if(!input.enabled) {await db.execute(sql`delete from ${table} where user_id=${userId}::uuid and ${column}=${input.id}::uuid`);return;}
  const domain=sql.identifier(input.kind==='follow'?'podcast_shows':'podcast_episodes');
  const [item]=await db.execute(sql`select media_item_id from ${domain} where media_item_id=${input.id}::uuid`);
  if(!item)throw new AdminError(404,'Podcast item not found.');
  await db.execute(sql`insert into ${table}(user_id,${column}) values (${userId}::uuid,${input.id}::uuid) on conflict do nothing`);
}
export async function readLibrary(userId:string,kind:'follow'|'save'|'recent',offset:number,db:BlomoonDb=getDb()) {
  const table=sql.identifier(kind==='follow'?'podcast_follows':kind==='save'?'podcast_saves':'podcast_listening');
  const id=kind==='follow'?sql`l.show_id`:sql`l.episode_id`;
  const date=kind==='recent'?sql`l.updated_at`:sql`l.created_at`;
  const rows=await db.execute(sql`select m.id,m.name,m.kind,${kind==='follow'?sql`m.id`:sql`e.show_id`} as "showId",
    ${kind==='recent'?sql`l.position_seconds`:sql`null`} as "positionSeconds",${kind==='recent'?sql`l.completed`:sql`null`} as completed
    from ${table} l join media_items m on m.id=${id} ${kind==='follow'?sql``:sql`join podcast_episodes e on e.media_item_id=m.id`}
    where l.user_id=${userId}::uuid order by ${date} desc,m.id limit 51 offset ${offset}`);
  return {items:rows.slice(0,50),nextOffset:rows.length>50?offset+50:null};
}
export async function showLibrary(userId:string,showId:string,db:BlomoonDb=getDb()) {
  const [follow]=await db.execute(sql`select 1 from podcast_follows where user_id=${userId}::uuid and show_id=${showId}::uuid`);
  return {following:Boolean(follow)};
}
