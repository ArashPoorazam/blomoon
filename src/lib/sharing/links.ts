import type { TerraModeId } from "@/lib/modes/types";

export function stationSharePath(modeId: TerraModeId, pointId: string) {
  return `/share/stations/${encodeURIComponent(modeId)}/${encodeURIComponent(pointId)}`;
}

export function folderSharePath(token: string) {
  return `/share/folders/${encodeURIComponent(token)}`;
}

export function absoluteShareLink(path: string, origin: string) {
  return new URL(path, origin).toString();
}

export function safeLocalReturnPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const url = new URL(value, "https://blomoon.local");
    return url.origin === "https://blomoon.local" ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch { return "/"; }
}
