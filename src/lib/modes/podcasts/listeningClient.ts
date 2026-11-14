import type { PlaybackLifecycle, ListeningSession } from '../playback/listeningSession';
// Only in-flight writes, never persisted account data; cleared on settlement.
const pendingWrites=new Map<string,Promise<unknown>>();
async function json(url:string,init:RequestInit) {
  const response=await fetch(url,{...init,cache:'no-store',headers:{'Content-Type':'application/json'}});
  if(!response.ok)throw new Error(response.status===409?'Listening changed on another device. Stop and play again to resume the latest position.':'Listening progress could not be synchronized. Stop and play again to retry.');
  return response.json();
}
export const podcastListeningLifecycle:PlaybackLifecycle={
  async prepare(point,signal) {
    if(point.modeId!=='podcasts' || point.kind!=='episode')return null;
    const url=`/api/modes/podcasts/episodes/${encodeURIComponent(point.id)}/listening`;
    const bounded=AbortSignal.any([signal,AbortSignal.timeout(10000)]);
    await pendingWrites.get(url);
    bounded.throwIfAborted();
    const current=await json(url,{signal:bounded});
    bounded.throwIfAborted();
    const sessionId=crypto.randomUUID();
    const state=await json(url,{method:'POST',signal:bounded,body:JSON.stringify({sessionId,expectedVersion:current.version})});
    bounded.throwIfAborted();
    let sequence=Number(state.sequence),error:string|null=null;
    let lastKey='';
    const session:ListeningSession={positionSeconds:state.completed?0:Number(state.positionSeconds),error:()=>error,
      save(position,completed) {
        if(error)return;
        const positionSeconds=Math.min(604800,Math.max(0,position.positionSeconds));
        const key=`${positionSeconds}:${completed}`;
        if(key===lastKey)return;
        lastKey=key;
        const pending=json(url,{method:'PUT',keepalive:true,signal:AbortSignal.timeout(10000),body:JSON.stringify({sessionId,sequence:++sequence,positionSeconds,completed})})
          .catch((reason:unknown)=>{error=reason instanceof Error?reason.message:'Listening progress could not be saved.';});
        const previous=pendingWrites.get(url);
        const settled=Promise.all([previous,pending]);
        pendingWrites.set(url,settled);
        void settled.finally(()=>{if(pendingWrites.get(url)===settled)pendingWrites.delete(url);});
      }};
    return session;
  },
};
