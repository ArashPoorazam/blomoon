import "server-only";
import { isSafeStreamUrl } from "./normalize";
import { STREAM_VALIDATION_TIMEOUT_MS } from "./config";

export function isMediaResponse(contentType: string | null) {
  const type = contentType?.split(";")[0].trim().toLowerCase();
  // Unknown types remain eligible: many working radio servers mislabel audio.
  return !type || (!type.startsWith("text/") && !["application/json", "application/xhtml+xml", "application/xml"].includes(type));
}

export async function resolveRadioStream(urls: (string | null)[]) {
  const candidates = [...new Set(urls.filter((url): url is string => Boolean(url && isSafeStreamUrl(url))))]
    .sort((a, b) => Number(b.startsWith("https:")) - Number(a.startsWith("https:")));
  const budget = AbortSignal.timeout(STREAM_VALIDATION_TIMEOUT_MS * 2);
  for (const streamUrl of candidates) {
    for (const method of ["HEAD", "GET"] as const) {
      if (budget.aborted) break;
      try {
        const response = await fetch(streamUrl, {
          method,
          redirect: "follow",
          signal: AbortSignal.any([budget, AbortSignal.timeout(STREAM_VALIDATION_TIMEOUT_MS)]),
          headers: { accept: "audio/*,*/*;q=0.8", ...(method === "GET" ? { range: "bytes=0-0" } : {}) }
        });
        const contentType = response.headers.get("content-type");
        const resolvedUrl = response.url || streamUrl;
        await response.body?.cancel();
        if (response.ok && isSafeStreamUrl(resolvedUrl) && isMediaResponse(contentType)) {
          return { streamUrl: resolvedUrl, contentType: contentType ?? undefined };
        }
      } catch {
        // Some stream servers reject HEAD or Range; try the next bounded probe.
      }
    }
  }
  throw new Error("Station stream is unavailable.");
}
