import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { mediaIdentitySchema, type MediaIdentity } from "@/lib/modes/identity";

/** Alias keys include domain kind: show and episode provider IDs may be identical. */
export async function resolveMediaAlias(ref: {
  modeId: MediaIdentity["modeId"]; kind: MediaIdentity["kind"];
  providerId: string; providerItemId: string;
}): Promise<MediaIdentity | null> {
  const aliases = schema.mediaIdentityAliases;
  const [row] = await getDb().select({ id: aliases.mediaItemId, modeId: aliases.modeId, kind: aliases.kind })
    .from(aliases).where(and(eq(aliases.modeId, ref.modeId), eq(aliases.kind, ref.kind),
      eq(aliases.providerId, ref.providerId), eq(aliases.providerItemId, ref.providerItemId)));
  return row ? mediaIdentitySchema.parse(row) : null;
}
