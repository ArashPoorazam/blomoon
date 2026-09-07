import { z } from "zod";
import { terraThemeIds } from "@/lib/theme/ids";

export const favouriteFolderInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).nullable().optional()
});

export const favouriteFolderItemInputSchema = z.object({
  modeId: z.string().min(1).max(40),
  pointId: z.string().min(1).max(160)
});

export const favouriteFolderIdSchema = z.uuid();
export const favouriteShareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,128}$/);

export const themeInputSchema = z.object({
  themeId: z.enum(terraThemeIds)
});
