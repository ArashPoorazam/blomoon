/** Long expiries must not overflow the browser's signed 32-bit timeout. */
export function scheduleExpiry(expiresAt: string | null, expire: () => void): () => void {
  if (expiresAt === null) return () => {};
  let timer: ReturnType<typeof setTimeout>;
  let cancelled = false;
  const check = () => {
    if (cancelled) return;
    const remaining = Date.parse(expiresAt) - Date.now();
    if (remaining <= 0) { expire(); return; }
    timer = setTimeout(check, Math.min(remaining, 2_147_483_647));
  };
  check();
  return () => { cancelled = true; clearTimeout(timer); };
}
