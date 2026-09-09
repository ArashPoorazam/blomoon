import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleRowBatch } from "./useProgressiveRows";

describe("drawer row scheduling", () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  function setup() {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => setTimeout(callback, 16));
    vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  }
  it("lets the shell reach a frame before rendering station rows", () => {
    setup();
    const render = vi.fn();
    scheduleRowBatch(render);
    expect(render).not.toHaveBeenCalled();
    vi.advanceTimersByTime(16);
    expect(render).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(render).toHaveBeenCalledOnce();
  });
  it.each([0, 16])("cancels work on navigation after %s ms", (elapsed) => {
    setup();
    const render = vi.fn();
    const cancel = scheduleRowBatch(render);
    vi.advanceTimersByTime(elapsed);
    cancel();
    vi.runAllTimers();
    expect(render).not.toHaveBeenCalled();
  });
});
