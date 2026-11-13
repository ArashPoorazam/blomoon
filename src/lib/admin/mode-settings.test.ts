import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('./registry',()=>({adminModes:[{descriptor:{id:'radio'}}]}));
vi.mock('./settings',()=>({getModeSettings:vi.fn(),saveSettings:vi.fn()}));
import {getModeSettings,saveSettings} from './settings';
import {discoveryModeSettings,saveRegisteredModeSettings} from './mode-settings';
beforeEach(()=>{vi.resetAllMocks();vi.mocked(getModeSettings).mockResolvedValue({enabled:true,version:0});});
it('exposes the registered podcast disable switch without claiming a catalog editor',async()=>{
  expect(await discoveryModeSettings()).toEqual([{id:'podcasts',label:'Podcasts',settings:{enabled:true,version:0}}]);
});
it('saves podcast mode settings through the existing audited versioned store',async()=>{
  await saveRegisteredModeSettings('admin','podcasts',{enabled:false,version:3});
  expect(saveSettings).toHaveBeenCalledWith('admin','mode:podcasts',{enabled:false,version:3});
  await saveRegisteredModeSettings('admin','radio',{enabled:true,version:2});
  expect(saveSettings).toHaveBeenCalledWith('admin','mode:radio',{enabled:true,version:2});
});
it('rejects unregistered modes and malformed settings without writes',async()=>{
  await expect(saveRegisteredModeSettings('admin','tv',{enabled:false,version:0})).rejects.toMatchObject({status:404});
  await expect(saveRegisteredModeSettings('admin','podcasts',{enabled:'false'})).rejects.toThrow();
  expect(saveSettings).not.toHaveBeenCalled();
});
