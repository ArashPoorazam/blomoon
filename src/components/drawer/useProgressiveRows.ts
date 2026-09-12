"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

const ROW_BATCH_SIZE = 30;

/** Give the destination shell a paint before mounting rows, then yield between batches. */
export function scheduleRowBatch(render: () => void) {
  let timeout: ReturnType<typeof setTimeout>;
  const frame = requestAnimationFrame(() => { timeout = setTimeout(render, 0); });
  return () => { cancelAnimationFrame(frame); clearTimeout(timeout); };
}

export function useProgressiveRows<T>(items: readonly T[]) {
  // Cached drawers show their first rows immediately when sliding into view.
  const [rendered, setRendered] = useState({ items, count: Math.min(items.length, ROW_BATCH_SIZE) });
  const count = rendered.items === items ? rendered.count : 0;
  useEffect(() => {
    if (count >= items.length) return;
    return scheduleRowBatch(() => startTransition(() => {
      setRendered({ items, count: Math.min(items.length, count + ROW_BATCH_SIZE) });
    }));
  }, [count, items]);
  const rows = useMemo(() => items.slice(0, count), [count, items]);
  return { rows, pending: count < items.length };
}
