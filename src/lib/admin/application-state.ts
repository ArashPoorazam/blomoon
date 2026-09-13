import "server-only";
import { getModeSettings, getSettings } from "./settings";
import { isAdmin } from "./access";
import { terraModes } from "@/lib/modes/registry";
export async function applicationState(
  user: { id: string; emailVerified: boolean } | null,
) {
  const [settings, states] = await Promise.all([
    getSettings(),
    Promise.all(
      terraModes.map(async (m) =>
        (await getModeSettings(m.id)).enabled ? m.id : null,
      ),
    ),
  ]);
  return {
    authenticated: Boolean(user),
    maintenance: settings.maintenance && !isAdmin(user),
    message: settings.maintenanceMessage,
    enabledModes: states.filter((id) => id !== null),
    announcement:
      settings.announcementExpiresAt &&
      Date.parse(settings.announcementExpiresAt) < Date.now()
        ? ""
        : settings.announcement,
    supportEmail: settings.supportEmail,
  };
}
