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
  it("prefers provider supplied HTTPS and preserves the validated entry URL", async () => {
    const response = new Response(null, { headers: { "content-type": "audio/mpeg" } });
    Object.defineProperty(response, "url", { value: "https://cdn.example/live" });
    const fetch = vi.fn(async (_url: string) => response);
    vi.stubGlobal("fetch", fetch);
    expect(await resolveRadioStream(["http://radio.example/live", "https://radio.example/live"])).toEqual({ streamUrl: "https://radio.example/live", contentType: "audio/mpeg", cacheable: true });
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

it("does not retain a redirected one-minute signed destination", async () => {
  const response = new Response(null, { headers: { "content-type": "audio/mpeg" } });
  Object.defineProperty(response, "url", { value: "https://cdn.example/live?issued=1789075560&expires=1789075620&token=secret" });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  expect(await resolveRadioStream(["https://entry.example/live"])).toMatchObject({ streamUrl: "https://entry.example/live", cacheable: true });
});
it("does not cache query URLs or fallback destinations", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(null, { headers: { "content-type": "audio/mpeg" } })));
  expect(await resolveRadioStream(["https://entry.example/live?key=value"])).toMatchObject({ cacheable: false });
  expect(await resolveRadioStream([], ["https://cdn.example/live"])).toMatchObject({ cacheable: false });
});
it("only returns an HTTPS destination for an HTTP entry, without caching", async () => {
  const response = new Response(null, { headers: { "content-type": "audio/mpeg" } });
  Object.defineProperty(response, "url", { value: "https://cdn.example/live" });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  expect(await resolveRadioStream(["http://entry.example/live"])).toMatchObject({ streamUrl: "https://cdn.example/live", cacheable: false });
});
it("rejects final HTTP responses even from HTTPS entries", async () => {
  const response = new Response(null, { headers: { "content-type": "audio/mpeg" } });
  Object.defineProperty(response, "url", { value: "http://cdn.example/live" });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  await expect(resolveRadioStream(["https://entry.example/live"])).rejects.toThrow("unavailable");
});
