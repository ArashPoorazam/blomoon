import "server-only";

import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { isGoogleAuthConfigured, type SafeUser } from "@/lib/auth/server";
import { logger } from "@/lib/server/logging";
import type { TerraThemeId } from "@/lib/theme/themes";
import { toViewerDto, type ViewerDto } from "./dto";

export async function getViewer(user: SafeUser): Promise<ViewerDto> {
  return logger.measure("users.viewer.get", {
    userId: user.id
  }, async () => {
    const db = getDb();
    const [[profile], accountRows] = await Promise.all([
      db
        .select({
          email: schema.users.email,
          emailVerified: schema.users.emailVerified,
          id: schema.users.id,
          image: schema.users.image,
          selectedTheme: schema.users.selectedTheme
        })
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1),
      db
        .select({ providerId: schema.accounts.providerId })
        .from(schema.accounts)
        .where(eq(schema.accounts.userId, user.id))
    ]);

    return toViewerDto({
      accountProviderIds: accountRows.map((account) => account.providerId),
      availableProviderIds: isGoogleAuthConfigured() ? ["credential", "google"] : ["credential"],
      email: profile?.email ?? user.email,
      emailVerified: profile?.emailVerified ?? user.emailVerified,
      id: profile?.id ?? user.id,
      image: profile?.image ?? user.image,
      selectedTheme: profile?.selectedTheme ?? user.selectedTheme
    });
  });
}

export async function updateViewerTheme(userId: string, selectedTheme: TerraThemeId) {
  const [profile] = await logger.measure("users.theme.update", {
    selectedTheme,
    userId
  }, () => getDb()
      .update(schema.users)
      .set({
        selectedTheme,
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, userId))
      .returning({
        selectedTheme: schema.users.selectedTheme
      }));

  return profile?.selectedTheme ?? selectedTheme;
}
