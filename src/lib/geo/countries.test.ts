import { describe, expect, it } from "vitest";
import { findCountryByCode, getAlphaCountryCode, getKnownCountries, normalizeCountryCode } from "./countries";
import { getCountryCollection, getCountryFeatureByCode, isCoordinateInCountry } from "./geometry";

describe("country metadata and geometry", () => {
  it("keeps the compact metadata synchronized with the installed atlas", () => {
    const names = new Map<string, string>();
    for (const feature of getCountryCollection().features) {
      if (!names.has(String(feature.id))) names.set(String(feature.id), feature.properties.name);
    }
    expect(getKnownCountries()).toEqual([...names].map(([code, name]) => ({ code, name })));
  });

  it.each([
    ["IR", undefined, "364"], ["4", undefined, "004"], ["XK", undefined, "X-KOSOVO"],
    ["", "United States", "840"], ["", "Türkiye", "792"], ["", "N. Cyprus", "X-NORTH-CYPRUS"],
    ["invalid", "Atlantis", undefined]
  ])("normalizes %s / %s", (code, name, expected) => {
    expect(normalizeCountryCode(code, name)).toBe(expected);
  });

  it("looks up indexed geometry and retains coordinate validation", () => {
    expect(getCountryFeatureByCode("4")).toBe(getCountryFeatureByCode("004"));
    expect(getCountryFeatureByCode("XK")?.properties.name).toBe("Kosovo");
    expect(getCountryFeatureByCode("invalid")).toBeNull();
    expect(isCoordinateInCountry(35.69, 51.39, "364")).toBe(true);
    expect(isCoordinateInCountry(NaN, 51.39, "364")).toBe(false);
    expect(findCountryByCode("364")?.name).toBe("Iran");
    expect(getAlphaCountryCode("364")).toBe("IR");
    expect(findCountryByCode("036")?.name).toBe("Australia");
    expect(isCoordinateInCountry(-33.87, 151.21, "036")).toBe(true);
  });
});
