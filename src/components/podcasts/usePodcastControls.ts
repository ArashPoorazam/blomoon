'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaybackController } from '@/lib/modes/usePlaybackCoordinator';
import type { TerraPoint } from '@/lib/modes/types';
import type { PodcastControls } from './PlaybackContext';
export function usePodcastControls(playback:PlaybackController,modeId:string):PodcastControls {
  const [queue,setQueue]=useState<TerraPoint[]>([]);
  const queueRef=useRef<TerraPoint[]>([]);
  const [sleepUntil,setSleepUntil]=useState<number|null>(null);
  const current=useRef(playback);current.current=playback;
  const lastEnded=useRef<string|null>(null);
  const replace=useCallback((items:TerraPoint[])=>{queueRef.current=items;setQueue(items);},[]);
  const remove=useCallback((id:string)=>replace(queueRef.current.filter(p=>p.id!==id)),[replace]);
  const play=useCallback((point:TerraPoint)=>{remove(point.id);void current.current.play(point);},[remove]);
  const next=useCallback(()=>{const point=queueRef.current[0];if(point)play(point);},[play]);
  const enqueue=useCallback((point:TerraPoint)=>{
    if(point.kind!=='episode' || point.modeId!=='podcasts' || queueRef.current.some(p=>p.id===point.id))return;
    replace([...queueRef.current,point].slice(0,100));
  },[replace]);
  useEffect(()=>{replace([]);setSleepUntil(null);lastEnded.current=null;},[modeId,replace]);
  useEffect(()=>{
    if(playback.status!=='stopped'){lastEnded.current=null;return;}
    if(playback.point?.modeId==='podcasts' && lastEnded.current!==playback.point.id){lastEnded.current=playback.point.id;next();}
  },[playback.status,playback.point,next]);
  useEffect(()=>{
    if(!sleepUntil)return;
    const expire=()=>{if(Date.now()>=sleepUntil){current.current.pause();setSleepUntil(null);}};
    const timer=setTimeout(expire,Math.max(0,sleepUntil-Date.now()));
    document.addEventListener('visibilitychange',expire);
    return ()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',expire);};
  },[sleepUntil]);
  useEffect(()=>{
    if(modeId!=='podcasts' || !('mediaSession' in navigator))return;
    const media=navigator.mediaSession;
    const handlers:Partial<Record<MediaSessionAction,MediaSessionActionHandler>>={
      play:()=>{void current.current.resume();},pause:()=>current.current.pause(),stop:()=>current.current.stop(),
      seekbackward:d=>{current.current.seek(Math.max(0,(current.current.position?.positionSeconds??0)-(d.seekOffset??15)));},
      seekforward:d=>{const p=current.current.position;if(p)current.current.seek(Math.min(p.durationSeconds??Infinity,p.positionSeconds+(d.seekOffset??30)));},
      seekto:d=>{if(d.seekTime!==undefined)current.current.seek(d.seekTime);},nexttrack:next,
    };
    for(const [action,handler] of Object.entries(handlers))try{media.setActionHandler(action as MediaSessionAction,handler);}catch{/* Optional browser capability. */}
    return ()=>{for(const action of Object.keys(handlers))try{media.setActionHandler(action as MediaSessionAction,null);}catch{}media.metadata=null;media.playbackState='none';};
  },[modeId,next]);
  useEffect(()=>{
    if(modeId!=='podcasts' || !('mediaSession' in navigator))return;
    const media=navigator.mediaSession;
    if(typeof MediaMetadata!=='undefined')media.metadata=playback.point?new MediaMetadata({title:playback.point.name,artist:playback.point.summary}):null;
    media.playbackState=playback.status==='playing'?'playing':playback.status==='paused'?'paused':'none';
    const p=playback.position;
    try {if(p?.durationSeconds)media.setPositionState?.({duration:p.durationSeconds,position:Math.min(p.positionSeconds,p.durationSeconds),playbackRate:p.rate});else media.setPositionState?.();}catch{/* Unsupported position reporting. */}
  },[modeId,playback.point,playback.status,playback.position]);
  return {playback,queue,sleepUntil,play,enqueue,remove,next,sleep:minutes=>setSleepUntil(minutes>0?Date.now()+minutes*60000:null)};
}
