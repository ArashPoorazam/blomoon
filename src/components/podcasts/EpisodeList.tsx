'use client';
import { useEffect, useState } from 'react';
type Episode={id:string;name:string;description:string;publishedAt:string|null;durationSeconds:number|null;explicit:boolean|null;author:string|null;copyright:string|null};
type Page={episodes:Episode[];nextOffset:number|null;pageToken:string;unavailable:boolean};
export function EpisodeList({showId}:{showId:string}) {
  const [page,setPage]=useState<Page|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [request,setRequest]=useState({offset:0,token:'',attempt:0});
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    const query=new URLSearchParams({offset:String(request.offset),limit:'25',...(request.token?{pageToken:request.token}:{})});
    void fetch(`/api/modes/podcasts/points/${encodeURIComponent(showId)}/episodes?${query}`,{signal:controller.signal,cache:'no-store'})
      .then(async response=>{
        if(response.status===409){setPage(null);setRequest({offset:0,token:'',attempt:request.attempt+1});return;}
        if(!response.ok)throw new Error('Episodes could not be loaded. Please retry.');
        const result=await response.json() as Page;
        if(!controller.signal.aborted)setPage(previous=>({...result,episodes:request.offset?[...(previous?.episodes ?? []),...result.episodes]:result.episodes}));
      }).catch((e:unknown)=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Episodes unavailable.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[showId,request]);
  return <section aria-label="Episodes"><h3>Episodes</h3><p>Episode playback and listening progress are coming in a later update.</p>
    {loading && <p role="status">Loading episodes…</p>}
    {error && <p role="alert">{error} <button type="button" onClick={()=>setRequest({...request,attempt:request.attempt+1})}>Retry</button></p>}
    {page?.unavailable ? <p role="status">This show is currently unavailable. Its saved link is retained.</p> : page && !page.episodes.length && !loading ? <p>No episodes have been published to this catalog yet.</p>:null}
    {page?.episodes.map(e=><article className="detail-section" key={e.id}><h4 dir="auto">{e.name}</h4><p>{e.publishedAt?new Date(e.publishedAt).toLocaleDateString():'Publication date unknown'}{e.durationSeconds!==null?` · ${Math.ceil(e.durationSeconds/60)} min`:''}{e.explicit?' · Explicit':''}</p><p dir="auto">{e.description}</p>{e.author && <p>{e.author}</p>}{e.copyright && <p>{e.copyright}</p>}</article>)}
    {page?.nextOffset!==null && page?.nextOffset!==undefined && <button type="button" disabled={loading} onClick={()=>setRequest({offset:page.nextOffset!,token:page.pageToken,attempt:0})}>Load more episodes</button>}
  </section>;
}
