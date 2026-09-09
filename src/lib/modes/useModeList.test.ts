import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchNextModePage } from "./useModeList";

afterEach(() => vi.unstubAllGlobals());
describe("recommendation expiry recovery", () => {
  it("replaces expired pages with a fresh first page", async () => {
    const page = { points: [{ id: "new" }], nextOffset: 50 };
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 409 })).mockResolvedValueOnce(Response.json(page));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchNextModePage("/next", "/first")).toEqual({ page, replaced: true });
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(["/next", "/first"]);
  });
  it("appends valid pages without refreshing", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ points: [] }));
    vi.stubGlobal("fetch", fetch);
    expect((await fetchNextModePage("/next", "/first")).replaced).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not retry indefinitely or hide provider failures", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 409 }));
    vi.stubGlobal("fetch", fetch);
    await expect(fetchNextModePage("/next", "/first")).rejects.toThrow("Could not renew suggestions");
    expect(fetch).toHaveBeenCalledTimes(2);
    fetch.mockClear().mockResolvedValue(new Response(null, { status: 503 }));
    await expect(fetchNextModePage("/next", "/first")).rejects.toThrow("Stations are unavailable");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
