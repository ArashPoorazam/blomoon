// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { PointListRow } from "./PointListRow";
import { radioMode } from "@/lib/modes/radio/mode";
import { discoveryPoint } from "@/lib/modes/discovery";
it("renders an unlocated show in the list and opens details without playing or saving it", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const point = discoveryPoint({ identity: { modeId: "podcasts", kind: "show", id: "test-show" }, name: "Unlocated show", summary: "A searchable show", location: { latitude: null, longitude: null, countryCode: null, locationPrecision: null } });
  const onInspect = vi.fn(), onPlay = vi.fn(), onToggleFavourite = vi.fn();
  const container = document.createElement("div"), root = createRoot(container);
  try {
    await act(async () => root.render(createElement(PointListRow, { point, activeMode: radioMode, selected: false, activePlaybackPointKey: null, favouritePointIds: new Set<string>(), onInspect, onPlay, onToggleFavourite, onShare: vi.fn() })));
    expect(container.textContent).toContain("Unlocated show");
    await act(async () => (container.querySelector('.point-row-main') as HTMLButtonElement).click());
    expect(onInspect).toHaveBeenCalledWith(point);
    expect(onPlay).not.toHaveBeenCalled();
    expect(onToggleFavourite).not.toHaveBeenCalled();
    expect(container.querySelector('.favourite-star')).toBeNull();
  } finally { await act(async () => root.unmount()); }
});
