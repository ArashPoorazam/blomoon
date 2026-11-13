// @vitest-environment jsdom
import { act,createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach,expect,it,vi } from 'vitest';
import { EpisodeList } from './EpisodeList';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.unstubAllGlobals());
it('shows empty, loading, unavailable and failed states with retry',async()=>{
 const container=document.createElement('div'),root=createRoot(container);
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 try {
   fetcher.mockImplementationOnce(()=>new Promise(()=>{}));
   await act(async()=>root.render(createElement(EpisodeList,{showId:'loading',key:'loading'})));
   expect(container.textContent).toContain('Loading episodes');
   for(const [id,response,text] of [['empty',{episodes:[],nextOffset:null,pageToken:'1',unavailable:false},'No episodes'],['disabled',{episodes:[],nextOffset:null,pageToken:'1',unavailable:true},'saved link is retained']] as const){
     fetcher.mockResolvedValueOnce(Response.json(response));
     await act(async()=>root.render(createElement(EpisodeList,{showId:id,key:id})));
     expect(container.textContent).toContain(text);
   }
   fetcher.mockRejectedValueOnce(new Error('Network failed'));
   await act(async()=>root.render(createElement(EpisodeList,{showId:'failed',key:'failed'})));
   expect(container.querySelector('[role="alert"]')?.textContent).toContain('Network failed');
   fetcher.mockResolvedValueOnce(Response.json({episodes:[{id:'e',name:'Episode',description:'<script>unsafe</script>',publishedAt:null,durationSeconds:0}],nextOffset:null,pageToken:'2'}));
   await act(async()=>container.querySelector('button')!.click());
   expect(container.textContent).toContain('Episode');expect(container.querySelector('script')).toBeNull();
 }finally{await act(async()=>root.unmount());}
});
it('replaces expired pagination instead of appending a different snapshot',async()=>{
 const container=document.createElement('div'),root=createRoot(container);
 const page=(id:string,nextOffset:number|null)=>({episodes:[{id,name:id,description:'',publishedAt:null,durationSeconds:null}],nextOffset,pageToken:id});
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json(page('old',25))).mockResolvedValueOnce(new Response('',{status:409})).mockResolvedValueOnce(Response.json(page('new',null)));
 vi.stubGlobal('fetch',fetcher);
 try{
 await act(async()=>root.render(createElement(EpisodeList,{showId:'show'})));
 await act(async()=>container.querySelector('button')!.click());
 expect(container.textContent).not.toContain('old');expect(container.textContent).toContain('new');
 }finally{await act(async()=>root.unmount());}
});
