import { afterEach, expect, it, vi } from "vitest";
vi.mock('./isolation',()=>({runIsolatedFetch:vi.fn()}));
import { runIsolatedFetch } from './isolation';
import { runIngestionOnce } from './worker';
import type { IngestionStore } from './store';
import { IngestionError } from './errors';
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();});
it('aborts work when a heartbeat loses ownership and never applies the stale result',async()=>{
  vi.useFakeTimers();
  const job={id:'job',source:{}};
  const store={claim:vi.fn(async()=>job),heartbeat:vi.fn(async()=>false),complete:vi.fn(),fail:vi.fn()} as unknown as IngestionStore;
  vi.mocked(runIsolatedFetch).mockImplementation((_source,_store,signal)=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new IngestionError('cancelled')))));
  const work=runIngestionOnce(store,new AbortController().signal);
  await vi.advanceTimersByTimeAsync(10000);expect(await work).toBe(true);
  expect(store.complete).not.toHaveBeenCalled();expect(store.fail).toHaveBeenCalledWith(job,'cancelled');expect(vi.getTimerCount()).toBe(0);
});
it('does no fetch when there is no due job and rejects cancellation before claiming',async()=>{
  const store={claim:vi.fn(async()=>null)} as unknown as IngestionStore;
  expect(await runIngestionOnce(store,new AbortController().signal)).toBe(false);
  expect(runIsolatedFetch).not.toHaveBeenCalled();
  await expect(runIngestionOnce(store,AbortSignal.abort())).rejects.toBeDefined();expect(store.claim).toHaveBeenCalledTimes(1);
});
