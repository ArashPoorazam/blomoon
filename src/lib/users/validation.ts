import { z } from "zod";
import { terraThemeIds } from "@/lib/theme/ids";

export const favouriteListInputSchema = z.object({
  name: z.string().trim().min(1).max(80)
});

export const favouriteListItemInputSchema = z.object({
  modeId: z.string().min(1).max(40),
  pointId: z.string().min(1).max(160)
});

export const themeInputSchema = z.object({
  themeId: z.enum(terraThemeIds)
});
