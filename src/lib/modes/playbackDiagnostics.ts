import { z } from "zod";

export const playbackDiagnosticSchema = z.object({
  modeId: z.string().regex(/^[a-z0-9-]{1,40}$/),
  pointId: z.string().regex(/^[a-zA-Z0-9_.:-]{1,200}$/),
  outcome: z.enum(["playing", "lookup", "timeout", "network", "unsupported", "permission", "unknown"]),
  lookupMs: z.number().int().min(0).max(300_000),
  startupMs: z.number().int().min(0).max(300_000),
  mediaErrorCode: z.number().int().min(0).max(4),
  readyState: z.number().int().min(0).max(4),
  networkState: z.number().int().min(0).max(3),
  browser: z.enum(["firefox", "edge", "chrome", "safari", "other"])
}).strict();

export type PlaybackDiagnostic = z.infer<typeof playbackDiagnosticSchema>;

export function reportPlaybackDiagnostic(event: Omit<PlaybackDiagnostic, "browser">) {
  const ua = navigator.userAgent;
  const browser = /Firefox|FxiOS/.test(ua) ? "firefox" : /Edg/.test(ua) ? "edge" : /Chrome|CriOS/.test(ua) ? "chrome" : /Safari/.test(ua) ? "safari" : "other";
  // Diagnostics never affect playback or display messages to the listener.
  void fetch("/api/playback/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...event, browser }),
    keepalive: true
  }).catch(() => {});
}
