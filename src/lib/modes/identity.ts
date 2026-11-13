import { z } from "zod";

const id = z.string().min(1).max(160);
export const mediaIdentitySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("station"), modeId: z.literal("radio"), id }),
  z.object({ kind: z.literal("show"), modeId: z.literal("podcasts"), id }),
  z.object({ kind: z.literal("episode"), modeId: z.literal("podcasts"), id }),
  z.object({ kind: z.literal("channel"), modeId: z.literal("tv"), id }),
]);
export type MediaIdentity = z.infer<typeof mediaIdentitySchema>;
export type PlayableIdentity = Exclude<MediaIdentity, { kind: "show" }>;
export type ShowFollow = { show: Extract<MediaIdentity, { kind: "show" }> };
export type EpisodeSave = { episode: Extract<MediaIdentity, { kind: "episode" }> };
export type PlayableHistoryRef = { item: PlayableIdentity };
export function isPlayableIdentity(value: MediaIdentity): value is PlayableIdentity {
  return value.kind !== "show";
}
export function mediaIdentityKey(value: MediaIdentity) {
  return JSON.stringify([value.modeId, value.kind, value.id]);
}

// Unknown coordinates stay null; country-only metadata never invents a marker.
export const mediaLocationSchema = z.object({
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  locationPrecision: z.enum(["station", "country", "verified"]).nullable(),
  countryCode: z.string().regex(/^(?:[0-9]{3}|X-.+)$/).nullable(),
}).refine(v => v.latitude === null
  ? v.longitude === null && v.locationPrecision === null
  : v.longitude !== null && v.locationPrecision !== null, "Coordinates and precision must be present together");
