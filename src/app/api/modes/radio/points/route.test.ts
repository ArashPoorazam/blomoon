import { expect, it, vi } from "vitest";
vi.mock("@/lib/modes/radio/globeCatalog", () => ({ getRadioDataset: vi.fn() }));
vi.mock("@/lib/server/logging", () => ({ logger: { warn: vi.fn() } }));
vi.mock("@/lib/server/logging/api", () => ({ withApiLogging: (_: string, handler: () => Promise<Response>) => handler }));
import { getRadioDataset } from "@/lib/modes/radio/globeCatalog";
import { GET } from "./route";

it("returns 503 for a catalog failure instead of a successful empty dataset", async () => {
  vi.mocked(getRadioDataset).mockRejectedValueOnce(new Error("statement timeout: private SQL"));
  const response = await GET(new Request("http://localhost/api/modes/radio/points"), undefined);
  expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Retry-After")).toBe("3");
  expect(await response.json()).toEqual({ error: "The station catalog is temporarily unavailable. Please try again." });
});

it("allows an honestly empty eligible catalog to succeed", async () => {
  const dataset = { modeId: "radio", points: [], source: { name: "Test", url: "https://example.com", attribution: "Test", lastUpdated: new Date(0).toISOString() } };
  vi.mocked(getRadioDataset).mockResolvedValueOnce(dataset);
  const response = await GET(new Request("http://localhost/api/modes/radio/points"), undefined);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(dataset);
});
