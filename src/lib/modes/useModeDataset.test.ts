// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { radioMode } from "./radio/mode";
import { useModeDataset, type ModeDatasetState } from "./useModeDataset";
import type { TerraDataset, TerraPoint } from "./types";

const list = vi.hoisted(() => ({ page: { points: [] as TerraPoint[], total: 0, nextOffset: null,
  source: null }, query: "", debouncedQuery: "", sortId: "votes_desc", loading: false,
  loadingMore: false, error: null, settled: true, setQuery: vi.fn(), setSortId: vi.fn(), loadMore: vi.fn() }));
vi.mock("./useModeList", () => ({ useModeList: () => list }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { vi.unstubAllGlobals(); list.page.points = []; });
const point = (id: string): TerraPoint => ({ id, modeId: "radio", name: id, summary: "Test", latitude: 0, longitude: 0 });
const source = { name: "Test catalog", url: "https://example.com", attribution: "Test", lastUpdated: new Date(0).toISOString() };
const baseline: TerraDataset = { modeId: "radio", points: [point("global"), point("country-leader")], source };

it("keeps baseline independent of list pages and replaces country additions", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: async () => url === radioMode.dataEndpoint
    ? baseline : { ...baseline, points: [point(url.includes("840") ? "us-extra" : "fr-extra")] } })));
  const host = document.createElement("div");
  const root = createRoot(host);
  let state: ModeDatasetState;
  function Harness({ country }: { country: string | null }) {
    state = useModeDataset(radioMode, country, baseline);
    return null;
  }
  try {
    await act(async () => root.render(createElement(Harness, { country: null })));
    expect(state!.globePoints).toEqual(baseline.points);
    list.page.points = [point("search-result"), point("next-page")];
    await act(async () => root.render(createElement(Harness, { country: "840" })));
    expect(state!.globePoints).toEqual([...baseline.points, point("us-extra")]);
    await act(async () => root.render(createElement(Harness, { country: "250" })));
    expect(state!.globePoints).toEqual([...baseline.points, point("fr-extra")]);
    await act(async () => root.render(createElement(Harness, { country: null })));
    expect(state!.globePoints).toEqual(baseline.points);
  } finally { act(() => root.unmount()); }
});

it("surfaces catalog failure notices even when the drawer list succeeds", async () => {
  const dataset = { ...baseline, points: [], source: { ...source, notice: "Catalog unavailable" } };
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => dataset })));
  const root = createRoot(document.createElement("div"));
  let state: ModeDatasetState;
  function Harness() { state = useModeDataset(radioMode, null, dataset); return null; }
  try {
    await act(async () => root.render(createElement(Harness)));
    expect(state!.providerError).toBe("Catalog unavailable");
  } finally { act(() => root.unmount()); }
});
