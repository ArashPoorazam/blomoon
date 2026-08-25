import { z } from "zod";

export const favouriteInputSchema = z.object({
  modeId: z.string().min(1).max(40),
  pointId: z.string().min(1).max(160)
});

export const themeInputSchema = z.object({
  themeId: z.enum(["night", "atlas"])
});
