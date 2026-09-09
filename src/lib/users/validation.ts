import { z } from "zod";
import { terraThemeIds } from "@/lib/theme/ids";

export const favouriteFolderInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).nullable().optional()
}).strict();

export const favouriteFolderCreateSchema = favouriteFolderInputSchema.extend({ modeId: z.string().min(1).max(40) });

export const favouriteFolderItemInputSchema = z.object({
  modeId: z.string().min(1).max(40),
  pointId: z.string().min(1).max(160)
});

export const favouriteFolderShareInputSchema = z.object({ rotate: z.boolean().optional() }).strict();

export const favouriteFolderIdSchema = z.uuid();
export const favouriteShareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,128}$/);

export const themeInputSchema = z.object({
  themeId: z.enum(terraThemeIds)
});

export const playbackHistoryInputSchema = z.object({
  modeId: z.string().min(1).max(40),
  pointId: z.string().min(1).max(160),
  timezoneOffsetMinutes: z.number().int().min(-840).max(720)
});
