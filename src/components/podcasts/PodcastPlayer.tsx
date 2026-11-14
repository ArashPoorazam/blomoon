'use client';
import { useState } from 'react';
import { usePodcastPlayback } from './PlaybackContext';
const clock=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
export function PodcastPlayer() {
  const controls=usePodcastPlayback();
  const [notice,setNotice]=useState('');
  if(!controls)return null;
  const {playback,queue}=controls;
  const p=playback.position;
  const seek=(value:number)=>setNotice(playback.seek(value)?'':'Seeking is not available yet for this publisher audio.');
  const playing=['playing','buffering'].includes(playback.status);
  return <section className="media-mini-player podcast-player" aria-label="Podcast player">
    <strong dir="auto">{playback.point?.name??'Choose an episode'}</strong>
    <div className="podcast-controls">
      <button type="button" disabled={!playback.point} onClick={()=>{if(playing)playback.pause();else if(playback.point)void playback.play(playback.point);}}>{playing?'Pause':'Play / resume'}</button>
      <button type="button" disabled={!playback.point} onClick={playback.stop}>Stop</button>
      <button type="button" disabled={!playback.controls.seek} onClick={()=>seek(Math.max(0,(p?.positionSeconds??0)-15))}>−15 seconds</button>
      <button type="button" disabled={!playback.controls.seek} onClick={()=>seek(Math.min(p?.durationSeconds??Infinity,(p?.positionSeconds??0)+30))}>+30 seconds</button>
      <button type="button" disabled={!queue.length} onClick={controls.next}>Next queued episode</button>
    </div>
    <label>Position {clock(p?.positionSeconds??0)} / {p?.durationSeconds?clock(p.durationSeconds):'Unknown'}
      <input aria-label="Episode position" type="range" min="0" max={p?.durationSeconds??0} step="1" value={Math.min(p?.positionSeconds??0,p?.durationSeconds??0)} disabled={!playback.controls.seek || !p?.durationSeconds} onChange={e=>seek(Number(e.target.value))}/>
    </label>
    <div className="podcast-controls">
      <label>Speed <select aria-label="Playback speed" value={p?.rate??1} disabled={!playback.controls.rate} onChange={e=>{if(!playback.setRate(Number(e.target.value)))setNotice('Playback speed is unavailable.');}}>{[0.5,0.75,1,1.25,1.5,1.75,2,2.5,3].map(rate=><option key={rate} value={rate}>{rate}×</option>)}</select></label>
      <label>Sleep timer <select aria-label="Sleep timer" value={controls.sleepUntil?'on':'0'} onChange={e=>controls.sleep(Number(e.target.value))}><option value="0">Off</option>{controls.sleepUntil&&<option value="on">Until {new Date(controls.sleepUntil).toLocaleTimeString()}</option>}{[5,15,30,60].map(minutes=><option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label>
    </div>
    <p role="status">{playback.status}{notice?` · ${notice}`:''}</p>
    {playback.error&&<p role="alert">{playback.error}</p>}{playback.progressError&&<p role="alert">{playback.progressError}</p>}
    <details><summary>Queue ({queue.length})</summary>{queue.map(point=><div key={point.id}><button type="button" onClick={()=>controls.play(point)}>{point.name}</button> <button type="button" aria-label={`Remove ${point.name} from queue`} onClick={()=>controls.remove(point.id)}>Remove</button></div>)}<p>Queued episodes play in order when the current episode ends. The queue lasts for this browsing session. Background playback and sleep timers depend on your browser; downloads and offline listening are unavailable.</p></details>
  </section>;
}
