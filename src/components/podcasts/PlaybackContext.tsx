'use client';
import { createContext, useContext } from 'react';
import type { PlaybackController } from '@/lib/modes/usePlaybackCoordinator';
import type { TerraPoint } from '@/lib/modes/types';
export type PodcastControls = {
  playback:PlaybackController; queue:TerraPoint[]; sleepUntil:number|null;
  play:(point:TerraPoint)=>void; enqueue:(point:TerraPoint)=>void; remove:(id:string)=>void; next:()=>void; sleep:(minutes:number)=>void;
};
export const PodcastPlaybackContext=createContext<PodcastControls|null>(null);
export const usePodcastPlayback=()=>useContext(PodcastPlaybackContext);
