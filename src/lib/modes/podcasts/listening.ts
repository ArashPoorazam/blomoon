import 'server-only';
import { sql } from 'drizzle-orm';
import { getDb, type BlomoonDb } from '@/db';
import { AdminError } from '@/lib/admin/access';
import { requireEpisode } from './episode';
import type { ProgressInput, SessionInput } from './listeningInput';
const fields=sql`version,session_id as "sessionId",sequence,position_seconds as "positionSeconds",completed`;
export async function readListening(userId:string,episodeId:string,db:BlomoonDb=getDb()) {
  await requireEpisode(episodeId,db);
  const [row]=await db.execute(sql`select ${fields} from podcast_listening where user_id=${userId}::uuid and episode_id=${episodeId}::uuid`);
  return row ?? {version:0,sessionId:null,sequence:0,positionSeconds:0,completed:false};
}
export async function beginListening(userId:string,episodeId:string,input:SessionInput,db:BlomoonDb=getDb()) {
  await requireEpisode(episodeId,db);
  return db.transaction(async tx=>{
    await tx.execute(sql`set local statement_timeout = '5s'`);
    await tx.execute(sql`insert into podcast_listening(user_id,episode_id) values (${userId}::uuid,${episodeId}::uuid) on conflict do nothing`);
    const [current]=await tx.execute(sql`select ${fields} from podcast_listening where user_id=${userId}::uuid and episode_id=${episodeId}::uuid for update`);
    if(current.sessionId===input.sessionId)return current;
    if(current.version!==input.expectedVersion)throw new AdminError(409,'Listening changed on another device. Play again to resume the latest position.');
    const [row]=await tx.execute(sql`update podcast_listening set version=version+1,session_id=${input.sessionId}::uuid,sequence=0,updated_at=now()
      where user_id=${userId}::uuid and episode_id=${episodeId}::uuid returning ${fields}`);
    return row;
  });
}
export async function saveListening(userId:string,episodeId:string,input:ProgressInput,db:BlomoonDb=getDb()) {
  await requireEpisode(episodeId,db);
  const [row]=await db.execute(sql`update podcast_listening set sequence=${input.sequence},position_seconds=${input.positionSeconds},completed=${input.completed},updated_at=now()
    where user_id=${userId}::uuid and episode_id=${episodeId}::uuid and session_id=${input.sessionId}::uuid and sequence<${input.sequence} returning ${fields}`);
  if(row)return row;
  const [current]=await db.execute(sql`select ${fields} from podcast_listening where user_id=${userId}::uuid and episode_id=${episodeId}::uuid`);
  if(!current || current.sessionId!==input.sessionId)throw new AdminError(409,'A newer listening session owns progress. Play again to take over.');
  // Duplicate and reordered writes are acknowledged without mutating newer state.
  return current;
}
