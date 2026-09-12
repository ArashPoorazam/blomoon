// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { usePlaybackHistory } from "./usePlaybackHistory";

let root: Root;
let container: HTMLElement;
let history: ReturnType<typeof usePlaybackHistory>;
const fetchMock = vi.fn();
function Harness({ userId }: { userId: string }) { history = usePlaybackHistory(userId); return null; }
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
  vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(createElement(Harness, { userId: "viewer-1" })));
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
it("reuses loaded history on drawer entry and refreshes only when requested", async () => {
  await act(async () => { await history.load("radio"); });
  const items = history.getState("radio").items;
  await act(async () => { await history.load("radio"); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(history.getState("radio").items).toBe(items);
  await act(async () => { await history.load("radio", true); });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("deduplicates in-flight entry loads and resets the cache on user change", async () => {
  await act(async () => { await Promise.all([history.load("radio"), history.load("radio")]); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async () => root.render(createElement(Harness, { userId: "viewer-2" })));
  await act(async () => { await history.load("radio"); });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("keeps an error visible until explicit retry", async () => {
  fetchMock.mockRejectedValueOnce(new Error("Unavailable"));
  await act(async () => { await history.load("radio"); });
  expect(history.getState("radio").status).toBe("error");
  await act(async () => { await history.load("radio"); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async () => { await history.load("radio", true); });
  expect(history.getState("radio").status).toBe("ready");
});
