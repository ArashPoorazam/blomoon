import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { AdminError } from "./access";
import {
  defaultSettings,
  settingsInput,
  modeSettingsInput,
  type ApplicationSettings,
  type ModeSettings,
} from "./contracts";
export async function getSettings(): Promise<ApplicationSettings> {
  const [row] = await getDb()
    .select()
    .from(schema.adminSettings)
    .where(eq(schema.adminSettings.id, "application"));
  return row
    ? settingsInput.parse({ ...row.value, version: row.version })
    : defaultSettings;
}
export async function getModeSettings(id: string): Promise<ModeSettings> {
  const [row] = await getDb()
    .select()
    .from(schema.adminSettings)
    .where(eq(schema.adminSettings.id, `mode:${id}`));
  return row
    ? modeSettingsInput.parse({ ...row.value, version: row.version })
    : { version: 0, enabled: true };
}
export async function saveSettings(
  actorId: string,
  id: string,
  value: ApplicationSettings | ModeSettings,
) {
  return getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`settings:${id}`}))`,
    );
    const [before] = await tx
      .select()
      .from(schema.adminSettings)
      .where(eq(schema.adminSettings.id, id));
    if ((before?.version ?? 0) !== value.version)
      throw new AdminError(409, "Settings changed. Reload before saving.");
    const version = value.version + 1;
    await tx
      .insert(schema.adminSettings)
      .values({ id, value: { ...value, version }, version })
      .onConflictDoUpdate({
        target: schema.adminSettings.id,
        set: { value: { ...value, version }, version },
      });
    await tx.insert(schema.adminAudit).values({
      actorId,
      resource: id,
      action: "settings.update",
      changes: { before: before?.value ?? null, after: value },
    });
    return { ...value, version };
  });
}
export async function isSuspended(userId: string) {
  const [row] = await getDb()
    .select({ id: schema.userSuspensions.userId })
    .from(schema.userSuspensions)
    .where(eq(schema.userSuspensions.userId, userId));
  return Boolean(row);
}
export async function assertRegistrationEnabled() {
  if (!(await getSettings()).registrationEnabled)
    throw new AdminError(403, "New registrations are currently closed.");
}
export function unblockedPredicate(
  modeId: string,
  pointId:
    import("drizzle-orm").SQL | import("drizzle-orm/pg-core").AnyPgColumn,
) {
  return sql`not exists(select 1 from media_blocks b where b.mode_id=${modeId} and b.point_id=${pointId})`;
}
