/** Bound work that cannot itself be cancelled, without retaining abort listeners. */
export function abortable<T>(work: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  const pending = Promise.resolve(work);
  if (signal.aborted) { void pending.catch(() => {}); return Promise.reject(signal.reason); }
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    pending.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}
