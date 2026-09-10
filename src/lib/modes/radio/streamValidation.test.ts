import { afterEach, describe, expect, it, vi } from "vitest";
import { isMediaResponse, resolveRadioStream } from "./streamValidation";
afterEach(() => vi.unstubAllGlobals());

describe("radio stream validation", () => {
  it("rejects successful HTML, JSON and XML responses", async () => {
    for (const type of ["text/html; charset=utf-8", "application/json", "application/xhtml+xml"]) expect(isMediaResponse(type)).toBe(false);
    const fetch = vi.fn(async () => new Response("login", { headers: { "content-type": "text/html" } }));
    vi.stubGlobal("fetch", fetch);
    await expect(resolveRadioStream(["https://radio.example/live"])).rejects.toThrow("unavailable");
  });
  it("prefers provider supplied HTTPS and returns the verified redirect URL", async () => {
    const response = new Response(null, { headers: { "content-type": "audio/mpeg" } });
    Object.defineProperty(response, "url", { value: "https://cdn.example/live" });
    const fetch = vi.fn(async (_url: string) => response);
    vi.stubGlobal("fetch", fetch);
    expect(await resolveRadioStream(["http://radio.example/live", "https://radio.example/live"])).toEqual({ streamUrl: "https://cdn.example/live", contentType: "audio/mpeg" });
    expect(fetch.mock.calls[0][0]).toBe("https://radio.example/live");
  });
  it("falls back to GET when HEAD is unsupported", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 405 })).mockResolvedValueOnce(new Response(null, { status: 206, headers: { "content-type": "audio/aac" } }));
    vi.stubGlobal("fetch", fetch);
    await expect(resolveRadioStream(["https://radio.example/live"])).resolves.toMatchObject({ contentType: "audio/aac" });
    expect(fetch.mock.calls[1][1].method).toBe("GET");
  });
  it("tries the catalog URL if the clicked URL is not media", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { headers: { "content-type": "text/html" } })).mockResolvedValueOnce(new Response(null, { headers: { "content-type": "text/html" } })).mockResolvedValueOnce(new Response(null, { headers: { "content-type": "audio/mpeg" } }));
    vi.stubGlobal("fetch", fetch);
    await expect(resolveRadioStream(["https://radio.example/bad", "https://radio.example/good"])).resolves.toMatchObject({ streamUrl: "https://radio.example/good" });
  });
});
