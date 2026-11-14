import type { TerraPoint } from '../types';
export type PlaybackPosition = {positionSeconds:number;durationSeconds:number|null;rate:number};
export type ListeningSession = {
  positionSeconds:number;
  save:(position:PlaybackPosition,completed:boolean)=>void;
  error:()=>string|null;
};
export type PlaybackLifecycle = {
  prepare:(point:TerraPoint,signal:AbortSignal)=>Promise<ListeningSession|null>;
};
