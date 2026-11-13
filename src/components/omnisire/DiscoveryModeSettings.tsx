'use client';
import { useState } from 'react';
import type { discoveryModeSettings } from '@/lib/admin/mode-settings';
import { Feedback, Loading, request, useAction, useResource } from './client';
import { useUnsaved } from './useUnsaved';
type Mode = Awaited<ReturnType<typeof discoveryModeSettings>>[number];
export function DiscoveryModeSettings() {
  const {data,error,refresh}=useResource<Mode[]>('mode-settings');
  return <><Feedback error={error} />{data ? data.map(mode =>
    <DiscoveryModeCard key={`${mode.id}:${mode.settings.version}`} mode={mode} refresh={refresh} />) : <Loading />}</>;
}
function DiscoveryModeCard({mode,refresh}:{mode:Mode;refresh:()=>void}) {
  const [enabled,setEnabled]=useState(mode.settings.enabled);
  const action=useAction(refresh);
  useUnsaved(enabled!==mode.settings.enabled);
  return <section className="om-panel"><h2>{mode.label}</h2>
    <p>Discovery is available. Catalog editing and playback administration are not available yet.</p>
    <Feedback {...action} />
    <form className="om-form" onSubmit={event=>{
      event.preventDefault();void action.run(()=>request(`modes/${mode.id}`,'PATCH',{...mode.settings,enabled}));
    }}>
      <label className="om-check"><input type="checkbox" checked={enabled} onChange={event=>setEnabled(event.target.checked)} /> Enable {mode.label} in Blomoon</label>
      <button type="submit" className="om-primary" disabled={action.busy}>Save mode settings</button>
    </form>
  </section>;
}
