import 'server-only';
import { findTerraMode, terraModes } from '@/lib/modes/registry';
import { AdminError } from './access';
import { adminModes } from './registry';
import { modeSettingsInput } from './contracts';
import { getModeSettings, saveSettings } from './settings';

/** Discovery modes need a disable switch before their full catalog editor ships. */
export async function discoveryModeSettings() {
  return Promise.all(terraModes
    .filter(mode => !adminModes.some(adapter => adapter.descriptor.id === mode.id))
    .map(async mode => ({ id: mode.id, label: mode.label, settings: await getModeSettings(mode.id) })));
}
export async function saveRegisteredModeSettings(actor: string, id: string, input: unknown) {
  if (!findTerraMode(id)) throw new AdminError(404, 'Mode not found.');
  return saveSettings(actor, `mode:${id}`, modeSettingsInput.parse(input));
}
