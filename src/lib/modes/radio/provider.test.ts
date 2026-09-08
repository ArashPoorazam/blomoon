import { afterEach, describe, expect, it, vi } from "vitest";
import { flushLogsForTest } from "@/lib/server/logging";
import {
  clearRadioBrowserHostCacheForTest,
  getRadioBrowserHosts
} from "./provider";
import {
  FALLBACK_CACHE_TTL_MS,
  RADIO_BROWSER_FALLBACK_HOSTS,
  STATION_CACHE_TTL_MS
} from "./config";

describe("Radio Browser host discovery", () => {
  afterEach(async () => {
    await flushLogsForTest();
    clearRadioBrowserHostCacheForTest();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shares one directory request between concurrent callers", async () => {
    let resolveDirectory!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => {
      resolveDirectory = resolve;
    }));
    vi.stubGlobal("fetch", fetchMock);

    const first = getRadioBrowserHosts();
    const second = getRadioBrowserHosts();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveDirectory(Response.json([
      { name: "de1.api.radio-browser.info" },
      { name: "fi1.api.radio-browser.info" }
    ]));

    await expect(first).resolves.toEqual([
      "de1.api.radio-browser.info",
      "fi1.api.radio-browser.info"
    ]);
    await expect(second).resolves.toEqual([
      "de1.api.radio-browser.info",
      "fi1.api.radio-browser.info"
    ]);
  });

  it("uses stale known-good hosts when a directory refresh fails", async () => {
    let now = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json([{ name: "fi1.api.radio-browser.info" }]))
      .mockRejectedValueOnce(new Error("directory unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getRadioBrowserHosts()).resolves.toEqual(["fi1.api.radio-browser.info"]);
    now += STATION_CACHE_TTL_MS + 1;
    await expect(getRadioBrowserHosts()).resolves.toEqual(["fi1.api.radio-browser.info"]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("short-caches only the static de1 fallback when discovery has never succeeded", async () => {
    let now = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const fetchMock = vi.fn().mockRejectedValue(new Error("directory unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getRadioBrowserHosts()).resolves.toEqual(["de1.api.radio-browser.info"]);
    now += FALLBACK_CACHE_TTL_MS - 1;
    await expect(getRadioBrowserHosts()).resolves.toEqual(["de1.api.radio-browser.info"]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(RADIO_BROWSER_FALLBACK_HOSTS).toEqual(["de1.api.radio-browser.info"]);
    expect(RADIO_BROWSER_FALLBACK_HOSTS).not.toContain("nl1.api.radio-browser.info");
    expect(RADIO_BROWSER_FALLBACK_HOSTS).not.toContain("at1.api.radio-browser.info");
  });
});
