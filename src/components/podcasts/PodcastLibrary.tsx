'use client';
import { useEffect, useState } from 'react';
import { usePodcastPlayback } from './PlaybackContext';
type Item={id:string;name:string;kind:'show'|'episode';showId:string;positionSeconds:number|null;completed:boolean|null};
export function PodcastLibrary({initialKind='follow'}:{initialKind?:'follow'|'save'|'recent'}) {
  const controls=usePodcastPlayback();
  const [kind,setKind]=useState<'follow'|'save'|'recent'>(initialKind);
  const [items,setItems]=useState<Item[]>([]);
  const [page,setPage]=useState(0),[next,setNext]=useState<number|null>(null),[attempt,setAttempt]=useState(0);
  const [error,setError]=useState(''),[loading,setLoading]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    void fetch(`/api/modes/podcasts/library?kind=${kind}&offset=${page}`,{signal:controller.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('Library unavailable.');return r.json();}).then(data=>{if(!controller.signal.aborted){setItems(data.items);setNext(data.nextOffset);}}).catch(()=>{if(!controller.signal.aborted)setError('Library unavailable. Please retry.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[kind,page,attempt]);
  return <section aria-label="Podcast library" className="detail-section"><h3>Your podcasts</h3>
    <label>Library <select value={kind} onChange={e=>{setKind(e.target.value as typeof kind);setPage(0);setItems([]);}}><option value="follow">Followed shows</option><option value="save">Saved episodes</option><option value="recent">Listening history</option></select></label>
    <button type="button" onClick={()=>setAttempt(n=>n+1)}>Refresh library</button>
    {loading?<p role="status">Loading library…</p>:error?<p role="alert">{error}</p>:<>{!items.length&&<p>No items yet.</p>}{items.map(item=><div key={item.id}><a href={`/podcasts/${item.showId}`}>{item.name}</a>{item.kind==='episode'&&controls&&<button type="button" onClick={()=>controls.play({id:item.id,name:item.name,kind:'episode',modeId:'podcasts',latitude:null,longitude:null,summary:'Podcast episode',metrics:{showId:item.showId}})}>{item.completed?'Play again':item.positionSeconds?`Resume · ${Math.floor(item.positionSeconds/60)} min`:'Play'}</button>}{kind!=='recent'&&<button type="button" onClick={()=>{void fetch('/api/modes/podcasts/library',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,kind,enabled:false})}).then(r=>{if(!r.ok)throw new Error();setAttempt(n=>n+1);}).catch(()=>setError('Could not update library.'));}}>Remove</button>}</div>)}</>}
    <button type="button" disabled={loading||!page} onClick={()=>setPage(n=>Math.max(0,n-50))}>Previous page</button><button type="button" disabled={loading||next===null} onClick={()=>next!==null&&setPage(next)}>Next page</button>
  </section>;
}
