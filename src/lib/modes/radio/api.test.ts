import { describe, expect, it } from "vitest";
import { isRadioStationId } from "./api";
import { isSafeStreamUrl, normalizeStation } from "./normalize";

describe("radio boundary validation", () => {
  it("accepts Radio Browser UUID station ids", () => {
    expect(isRadioStationId("8bdb6947-f995-46c5-8266-c3c94f93fcd9")).toBe(true);
  });

  it("rejects non-UUID station ids before persistence", () => {
    expect(isRadioStationId("../../../etc/passwd")).toBe(false);
    expect(isRadioStationId("not-a-station")).toBe(false);
  });

  it("allows only http and https stream URLs", () => {
    expect(isSafeStreamUrl("https://example.com/live.mp3")).toBe(true);
    expect(isSafeStreamUrl("http://example.com/live.mp3")).toBe(true);
    expect(isSafeStreamUrl("file:///tmp/live.mp3")).toBe(false);
    expect(isSafeStreamUrl("javascript:alert(1)")).toBe(false);
  });

  it("normalizes safe station artwork URLs", () => {
    const record = normalizeStation({
      stationuuid: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      name: "Test Radio",
      url: "https://example.com/live.mp3",
      favicon: "https://example.com/logo.png",
      country: "United States",
      countrycode: "US",
      language: "English",
      lastcheckok: 1,
      geo_lat: 47.62,
      geo_long: -122.35
    });

    expect(record?.point.artworkUrl).toBe("https://example.com/logo.png");
    expect(record?.detail.artworkUrl).toBe("https://example.com/logo.png");
  });

  it("drops unsafe station artwork URLs", () => {
    const record = normalizeStation({
      stationuuid: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      name: "Test Radio",
      url: "https://example.com/live.mp3",
      favicon: "javascript:alert(1)",
      country: "United States",
      countrycode: "US",
      language: "English",
      lastcheckok: 1,
      geo_lat: 47.62,
      geo_long: -122.35
    });

    expect(record?.point.artworkUrl).toBeUndefined();
    expect(record?.detail.artworkUrl).toBeUndefined();
  });
});
