import { expect, it } from "vitest";
import { mediaIdentityKey, mediaIdentitySchema, isPlayableIdentity, mediaLocationSchema } from "./identity";
import { discoveryPoint } from "./discovery";
import { hasPointLocation } from "./location";
import { uniquePoints } from "./pointCollections";
import { stationSharePath } from "@/lib/sharing/links";
import { formatCoordinate } from "@/lib/format";
const unknown = { latitude: null, longitude: null, locationPrecision: null, countryCode: null };
it("separates show follows, episode saves and playable identities, including provider ID collisions", () => {
  const show = mediaIdentitySchema.parse({ modeId: "podcasts", kind: "show", id: "same" });
  const episode = mediaIdentitySchema.parse({ modeId: "podcasts", kind: "episode", id: "same" });
  expect(mediaIdentityKey(show)).not.toBe(mediaIdentityKey(episode));
  expect(isPlayableIdentity(show)).toBe(false);
  expect(isPlayableIdentity(episode)).toBe(true);
  expect(mediaIdentitySchema.safeParse({ modeId: "radio", kind: "episode", id: "same" }).success).toBe(false);
});
it("keeps unknown-location items in discovery lists and sharing without creating markers", () => {
  const channel = discoveryPoint({ identity: { modeId: "tv", kind: "channel", id: "same" }, name: "Unknown location", summary: "Available in search", location: unknown });
  const station = { ...channel, modeId: "radio", latitude: 0, longitude: 0 };
  expect(uniquePoints([channel, station])).toHaveLength(2);
  expect(hasPointLocation(channel)).toBe(false);
  expect(hasPointLocation(station)).toBe(true); // genuine zero coordinates are valid
  expect(stationSharePath(channel.modeId, channel.id)).toBe("/share/stations/tv/same");
  expect(stationSharePath(station.modeId, station.id)).not.toBe(stationSharePath(channel.modeId, channel.id));
  expect(formatCoordinate(null, "N", "S")).toBe("Unknown");
  expect(hasPointLocation({ ...channel, latitude: 10, longitude: 20 })).toBe(false);
  expect(hasPointLocation({ ...channel, latitude: 10, longitude: 20, locationPrecision: "verified" })).toBe(true);
});
it("rejects half-known, invalid and unlabeled locations", () => {
  for (const value of [{ ...unknown, latitude: 1 }, { ...unknown, longitude: 1 },
    { ...unknown, latitude: 91, longitude: 0, locationPrecision: "verified" },
    { ...unknown, latitude: 0, longitude: 0 }, { ...unknown, locationPrecision: "verified" }]) {
    expect(mediaLocationSchema.safeParse(value).success).toBe(false);
  }
  expect(mediaLocationSchema.safeParse({ ...unknown, countryCode: "364" }).success).toBe(true);
});
