import { afterEach, expect, it, vi } from "vitest";
import { scheduleExpiry } from "./expiry";
afterEach(() => vi.useRealTimers());
it("handles expiries beyond the browser timer limit and supports cleanup", async () => {
  vi.useFakeTimers();
  const expired = vi.fn();
  const cancel = scheduleExpiry(new Date(Date.now() + 2_147_483_647 + 1000).toISOString(), expired);
  await vi.advanceTimersByTimeAsync(2_147_483_647);
  expect(expired).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1000);
  expect(expired).toHaveBeenCalledTimes(1);
  cancel();
  const removed = scheduleExpiry(new Date(Date.now() + 1000).toISOString(), expired);
  removed();
  await vi.advanceTimersByTimeAsync(1000);
  expect(expired).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
});
