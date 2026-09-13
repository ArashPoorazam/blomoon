import { abortable } from "@/lib/abort";

const active = new Map<string, number>();
const waiting = new Map<string, Set<() => void>>();
/** Also bounds destinations reached through redirects within this worker process. */
export async function acquireHostSlot(host: string, signal: AbortSignal): Promise<() => void> {
  while ((active.get(host) ?? 0) >= 2) {
    let wake: () => void = () => {};
    const changed = new Promise<void>((resolve) => {
      wake = resolve;
    });
    const listeners = waiting.get(host) ?? new Set<() => void>();
    listeners.add(wake);
    waiting.set(host, listeners);
    try {
      await abortable(changed, signal);
    } finally {
      listeners.delete(wake);
      if (!listeners.size) waiting.delete(host);
    }
  }
  signal.throwIfAborted();
  active.set(host, (active.get(host) ?? 0) + 1);
  return () => {
    const count = (active.get(host) ?? 1) - 1;
    if (count) active.set(host, count);
    else active.delete(host);
    for (const wake of waiting.get(host) ?? []) wake();
  };
}
