// @vitest-environment jsdom
import { act,createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect,it,vi } from 'vitest';
import type { PlaybackController } from '@/lib/modes/usePlaybackCoordinator';
import type { TerraPoint } from '@/lib/modes/types';
import { usePodcastControls } from './usePodcastControls';
import type { PodcastControls } from './PlaybackContext';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('deduplicates/caps the queue, advances only on end, expires sleep and clears on mode change',async()=>{
 vi.useFakeTimers();const root=createRoot(document.createElement('div'));
 const play=vi.fn(),pause=vi.fn();let controls:PodcastControls;
 const player={play,pause,status:'playing',point:{id:'active',modeId:'podcasts'}} as unknown as PlaybackController;
 function Harness({mode='podcasts'}:{mode?:string}){controls=usePodcastControls(player,mode);return null;}
 const episode={id:'one',kind:'episode',modeId:'podcasts'} as TerraPoint;
 try{
  await act(async()=>root.render(createElement(Harness)));
  await act(async()=>{controls.enqueue(episode);controls.enqueue(episode);});expect(controls!.queue).toHaveLength(1);
  player.status='paused';await act(async()=>root.render(createElement(Harness)));expect(play).not.toHaveBeenCalled();
  player.status='stopped';await act(async()=>root.render(createElement(Harness)));expect(play).toHaveBeenCalledExactlyOnceWith(episode);expect(controls!.queue).toHaveLength(0);
  await act(async()=>root.render(createElement(Harness)));expect(play).toHaveBeenCalledTimes(1);
  await act(async()=>controls!.sleep(5));await act(async()=>vi.advanceTimersByTimeAsync(300000));expect(pause).toHaveBeenCalledTimes(1);
  await act(async()=>{for(let i=0;i<105;i++)controls!.enqueue({...episode,id:String(i)});});expect(controls!.queue).toHaveLength(100);
  await act(async()=>root.render(createElement(Harness,{mode:'radio'})));expect(controls!.queue).toHaveLength(0);expect(controls!.sleepUntil).toBeNull();
 }finally{await act(async()=>root.unmount());vi.useRealTimers();}
});
