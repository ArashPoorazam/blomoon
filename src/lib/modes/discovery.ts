import { z } from "zod";
import { mediaIdentitySchema, mediaLocationSchema } from "./identity";
import type { TerraPoint } from "./types";

/** Domain DTOs project into list/globe presentation without making shows playable. */
export const discoveryItemSchema = z.object({
  identity: mediaIdentitySchema,
  name: z.string().min(1).max(1000),
  summary: z.string().max(10000),
  location: mediaLocationSchema,
});
export type DiscoveryItem = z.infer<typeof discoveryItemSchema>;
export function discoveryPoint(input: unknown): TerraPoint {
  const item = discoveryItemSchema.parse(input);
  return {
    kind: item.identity.kind, id: item.identity.id, modeId: item.identity.modeId, name: item.name, summary: item.summary,
    latitude: item.location.latitude, longitude: item.location.longitude,
    locationPrecision: item.location.locationPrecision, countryCode: item.location.countryCode ?? undefined,
  };
}
