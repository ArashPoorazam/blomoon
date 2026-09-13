import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./catalog", () => ({ getRadioDataset: vi.fn() }));
import { getRadioDataset } from "./catalog";
import { getRadioStartupDataset } from "./startup";
beforeEach(() => vi.resetAllMocks());
describe("catalog startup", () => {
  it("returns the catalog without manufacturing fallback points", async () => {
    const dataset = {
      modeId: "radio",
      points: [],
      source: {
        name: "Catalog",
        url: "https://example.com",
        attribution: "Test",
        lastUpdated: new Date(0).toISOString(),
      },
    };
    vi.mocked(getRadioDataset).mockResolvedValue(dataset);
    expect(await getRadioStartupDataset()).toEqual(dataset);
  });
  it("exposes an unavailable state with no fixture bypass on database failure", async () => {
    vi.mocked(getRadioDataset).mockRejectedValue(new Error("database offline"));
    const dataset = await getRadioStartupDataset();
    expect(dataset.points).toEqual([]);
    expect(dataset.source.notice).toContain("unavailable");
  });
});
