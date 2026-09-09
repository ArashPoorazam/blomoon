import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker(fetcher = vi.fn()) {
  type WorkerEvent = {
    request?: { url: string; mode: string; method: string };
    respondWith?: (response: Promise<Response>) => void;
    waitUntil?: (promise: Promise<void>) => void;
  };
  const handlers: Record<string, (event: WorkerEvent) => void> = {};
  const cache = { put: vi.fn(), match: vi.fn().mockResolvedValue(new Response("offline")) };
  const caches = { open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue(["other-app", "blomoon-offline-v0", "blomoon-offline-v1"]), delete: vi.fn() };
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { addEventListener: (name: string, fn: typeof handlers[string]) => { handlers[name] = fn; }, location: { origin: "https://blomoon.ir" }, clients: { claim: vi.fn() } },
    caches, fetch: fetcher, URL, Response, Request
  });
  return { handlers, caches, cache };
}
describe("offline worker boundaries", () => {
  it.each([
    ["/api/users/me", "navigate", "GET"], ["/api/auth/callback/google", "navigate", "GET"],
    ["/_next/static/app.js", "navigate", "GET"], ["/", "cors", "GET"],
    ["https://stream.example/live", "navigate", "GET"], ["/", "navigate", "POST"]
  ])("does not intercept %s %s %s", (path, mode, method) => {
    const { handlers } = worker(); const respondWith = vi.fn();
    handlers.fetch({ request: { url: new URL(path, "https://blomoon.ir").href, mode, method }, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });
  it("returns server failures unchanged and falls back only on network failure", async () => {
    for (const online of [true, false]) {
      const server = new Response("server error", { status: 503 });
      const fetcher = online ? vi.fn().mockResolvedValue(server) : vi.fn().mockRejectedValue(new Error("offline"));
      const { handlers } = worker(fetcher); let result!: Promise<Response>;
      handlers.fetch({ request: { url: "https://blomoon.ir/", mode: "navigate", method: "GET" }, respondWith: (value: Promise<Response>) => { result = value; } });
      expect(await (await result).text()).toBe(online ? "server error" : "offline");
    }
  });
  it("refuses to cache a failed offline document", async () => {
    const { handlers, cache } = worker(vi.fn().mockResolvedValue(new Response("login", { status: 503 })));
    let pending!: Promise<void>;
    handlers.install({ waitUntil: (value) => { pending = value; } });
    await expect(pending).rejects.toThrow("Offline document unavailable");
    expect(cache.put).not.toHaveBeenCalled();
  });
  it("only removes obsolete Blomoon offline caches", async () => {
    const { handlers, caches } = worker(); let pending!: Promise<void>;
    handlers.activate({ waitUntil: (value: Promise<void>) => { pending = value; } });
    await pending;
    expect(caches.delete.mock.calls).toEqual([["blomoon-offline-v0"]]);
  });
});
