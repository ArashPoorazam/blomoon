// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { DrawerPages } from "./DrawerPages";
import { useDrawerTransition } from "./useDrawerTransition";
import type { MainDrawer } from "../shell/mainDrawerNavigation";

const containers: HTMLElement[] = [];
afterEach(() => { containers.forEach(c => c.remove()); vi.unstubAllGlobals(); });
it("promotes the incoming DOM intact and removes the old page after a committed swipe", () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  let controls: ReturnType<typeof useDrawerTransition>;
  function Harness() {
    const [view, setView] = useState<MainDrawer>("history");
    controls = useDrawerTransition(view, view, setView);
    return <DrawerPages entry={{ kind: view }} modeId="radio" motion={controls.motion}
      renderContent={entry => <input aria-label={entry.kind} defaultValue="unchanged" />} />;
  }
  const container = document.createElement("div"); document.body.append(container); containers.push(container);
  const root = createRoot(container);
  act(() => root.render(<Harness />));
  act(() => { controls.horizontal.begin(); controls.horizontal.move(-120, 400); });
  expect(container.querySelectorAll(".drawer-page")).toHaveLength(2);
  const incoming = container.querySelector<HTMLElement>(".drawer-page-incoming")!;
  const input = incoming.querySelector("input")!;
  input.value = "preserved";
  expect(incoming.hasAttribute("inert")).toBe(true);
  act(() => controls.horizontal.end(-120, 0, 400));
  expect(container.querySelectorAll(".drawer-page")).toHaveLength(1);
  expect(container.querySelector(".drawer-page")).toBe(incoming);
  expect(container.querySelector("input")).toBe(input);
  expect(input.value).toBe("preserved");
  expect(incoming.hasAttribute("inert")).toBe(false);
  act(() => root.unmount());
});
