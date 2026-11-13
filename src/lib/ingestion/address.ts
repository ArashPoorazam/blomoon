import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPublicAddress } from "../network/publicAddress";
import { abortable } from "../abort";
import { IngestionError } from "./errors";

export function approvedUrl(raw: string, origins: readonly string[]) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new IngestionError("unsafe_address"); }
  if (raw.length > 4096 || url.protocol !== "https:" || url.username || url.password || url.hash || (url.port && url.port !== "443")) {
    throw new IngestionError("unsafe_address");
  }
  if (!origins.includes(url.origin)) throw new IngestionError("unapproved_origin");
  return url;
}
export async function resolvePublicAddress(url: URL, signal: AbortSignal) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await abortable(lookup(host, { all: true }), signal);
  if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) throw new IngestionError("unsafe_address");
  addresses.sort((a, b) => a.family - b.family);
  return { host, ...addresses[0] };
}
