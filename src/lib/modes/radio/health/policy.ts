export const HEALTH_TTL_MS = 24 * 60 * 60 * 1000;
export const HEALTHY_INTERVAL_MS = 6 * 60 * 60 * 1000;
export type StreamHealth = { enabled: boolean; lastSuccess: Date | null; failures: number };
export function isRecentlyVerified(source: StreamHealth, now = Date.now()) {
  return (
    source.enabled &&
    source.lastSuccess !== null &&
    source.lastSuccess.getTime() > now - HEALTH_TTL_MS &&
    source.failures < 3
  );
}
export function nextCheckDelay(success: boolean, failures: number, recentlyPlayed: boolean) {
  if (success) return recentlyPlayed ? 60 * 60 * 1000 : HEALTHY_INTERVAL_MS;
  return [5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, HEALTH_TTL_MS][Math.min(Math.max(failures - 1, 0), 3)];
}
export function healthFilteringEnabled() {
  return process.env.BLOMOON_RADIO_HEALTH_MODE !== "observe";
}
