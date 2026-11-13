import { z } from "zod";
import type { TerraPlaybackConfig, TerraPoint } from "../types";
import { PlaybackError } from "./errors";

const source = z.object({
  url: z.string().max(8192).url().refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  }),
  transport: z.enum(["direct", "hls", "embed"]),
  contentType: z.string().max(200).optional(),
}).strict();

export const playbackDescriptorSchema = z.object({
  version: z.literal(1),
  modeId: z.string().min(1).max(40),
  pointId: z.string().min(1).max(200),
  mediaKind: z.enum(["audio", "video"]),
  timeline: z.enum(["live", "on-demand"]),
  // No inferred TTL: null means the resolver supplies no known expiry.
  expiresAt: z.iso.datetime({ offset: true }).nullable(),
  controls: z.object({ pause: z.boolean(), seek: z.boolean(), rate: z.boolean() }).strict(),
  sources: z.array(source).min(1).max(2),
}).strict().refine(value => value.timeline !== "live" || (!value.controls.seek && !value.controls.rate));

export type PlaybackDescriptor = z.infer<typeof playbackDescriptorSchema>;
export type PlaybackSource = PlaybackDescriptor["sources"][number];
export type PlaybackControls = PlaybackDescriptor["controls"];
export const NO_CONTROLS: PlaybackControls = { pause: false, seek: false, rate: false };

export function validatePlaybackDescriptor(value: unknown, point: TerraPoint, config: TerraPlaybackConfig): PlaybackDescriptor {
  const result = playbackDescriptorSchema.safeParse(value);
  if (!result.success || result.data.modeId !== point.modeId || result.data.pointId !== point.id ||
      result.data.modeId !== config.modeId || result.data.mediaKind !== config.mediaKind) {
    throw new PlaybackError("invalid_descriptor");
  }
  if (result.data.expiresAt !== null && Date.parse(result.data.expiresAt) <= Date.now()) throw new PlaybackError("expired");
  return result.data;
}
