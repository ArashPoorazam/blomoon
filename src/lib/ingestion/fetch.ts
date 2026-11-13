import { request } from "node:https";
import { isIP } from "node:net";
import { Transform, Writable, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip, createInflate, createBrotliDecompress } from "node:zlib";
import { approvedUrl, resolvePublicAddress } from "./address";
import { INGESTION_LIMITS as limits, type FetchInput } from "./contracts";
import { IngestionError } from "./errors";

export type HostSlot = (host: string, signal: AbortSignal) => Promise<() => Promise<void>>;
export type FetchedDocument = { status: "modified" | "not_modified"; finalUrl: string; etag: string | null; lastModified: string | null; body: Buffer };
function validator(value: unknown) {
  return typeof value === "string" && value.length <= 512 && !/[\x00-\x1f\x7f]/.test(value) ? value : null;
}

export async function fetchDocument(input: FetchInput, acquire: HostSlot, cancellation: AbortSignal, format: "xml" | "json" = "xml"): Promise<FetchedDocument> {
  const large = input.largePodcastFeed === true && input.url === "https://feeds.jupiterbroadcasting.com/lup";
  const byteLimits = large ? {wireBytes: 12 * 1024 * 1024, decodedBytes: 12 * 1024 * 1024} : limits;
  const deadline = AbortSignal.timeout(large ? 25_000 : limits.timeoutMs);
  const signal = AbortSignal.any([cancellation, deadline]);
  try {
    let url = approvedUrl(input.url, input.origins);
    for (let redirects = 0; ; redirects++) {
      signal.throwIfAborted();
      // Resolve again on EVERY hop, and connect only to this validated address (no second DNS lookup).
      const address = await resolvePublicAddress(url, signal);
      const release = await acquire(address.host, signal);
      try {
        const conditional = url.href === input.validatorUrl;
        const headers: Record<string, string> = { Host: url.host, Accept: format === "json" ? "application/json" : "application/rss+xml, application/atom+xml, application/xml, text/xml", "Accept-Encoding": "gzip, deflate, br", "User-Agent": "Blomoon ingestion/1.0" };
        if (conditional && validator(input.etag)) headers["If-None-Match"] = input.etag!;
        if (conditional && validator(input.lastModified)) headers["If-Modified-Since"] = input.lastModified!;
        const res = await requestPublicAddresses(address, url, headers, signal);
        try {
          if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0)) {
            if (redirects >= limits.redirects) throw new IngestionError("redirect_limit");
            if (!res.headers.location) throw new IngestionError("http_error");
            url = approvedUrl(new URL(res.headers.location, url).href, input.origins);
            continue;
          }
          const etag = validator(res.headers.etag), lastModified = validator(res.headers["last-modified"]);
          if (res.statusCode === 304) {
            if (!headers["If-None-Match"] && !headers["If-Modified-Since"]) throw new IngestionError("http_error");
            return { status: "not_modified", finalUrl: url.href, etag, lastModified, body: Buffer.alloc(0) };
          }
          if (res.statusCode !== 200) throw new IngestionError("http_error");
          const type = res.headers["content-type"] ?? "";
          const validType = format === "json" ? /^application\/json(?:\s*;|$)/i.test(type) : /^(?:application\/(?:[\w.+-]+\+)?xml|text\/xml)(?:\s*;|$)/i.test(type);
          if ((format === "json" || type) && !validType) throw new IngestionError("http_error");
          const charset = type.match(/charset\s*=\s*["']?([^;\s"']+)/i)?.[1];
          if (charset && !/^utf-?8$/i.test(charset)) throw new IngestionError("encoding");
          if (Number(res.headers["content-length"]) > byteLimits.wireBytes) throw new IngestionError("too_large");
          const body = await readBody(res, res.headers["content-encoding"], signal, byteLimits);
          return { status: "modified", finalUrl: url.href, etag, lastModified, body };
        } finally { res.destroy(); }
      } finally { await release(); }
    }
  } catch (error) {
    if (cancellation.aborted) throw new IngestionError("cancelled");
    if (deadline.aborted) throw new IngestionError("timeout");
    if (error instanceof IngestionError) throw error;
    throw new IngestionError("network");
  }
}

async function readBody(source: Readable, encoding: string | undefined, signal: AbortSignal, byteLimits: {wireBytes:number;decodedBytes:number}) {
  let wire = 0, decoded = 0;
  const chunks: Buffer[] = [];
  const boundWire = new Transform({ transform(chunk: Buffer, _encoding, callback) {
    wire += chunk.length;
    callback(wire > byteLimits.wireBytes ? new IngestionError("too_large") : null, chunk);
  } });
  const sink = new Writable({ write(chunk: Buffer, _encoding, callback) {
    decoded += chunk.length;
    if (decoded > byteLimits.decodedBytes) return callback(new IngestionError("too_large"));
    chunks.push(chunk); callback();
  } });
  const normalized = encoding?.trim().toLowerCase();
  const decompress = !normalized || normalized === "identity" ? null : normalized === "gzip" ? createGunzip() : normalized === "deflate" ? createInflate() : normalized === "br" ? createBrotliDecompress() : undefined;
  if (decompress === undefined) throw new IngestionError("encoding");
  await pipeline(decompress ? [source, boundWire, decompress, sink] : [source, boundWire, sink], { signal });
  return Buffer.concat(chunks, decoded);
}

/** DNS is validated once as a complete set, then pinned on each bounded connection attempt.
 * Retry only failures before response headers; never retry a publisher HTTP error or body.
 */
async function requestPublicAddresses(address: Awaited<ReturnType<typeof resolvePublicAddress>>, url: URL, headers: Record<string,string>, signal: AbortSignal) {
  for (const candidate of address.alternatives) {
    signal.throwIfAborted();
    try {
      return await new Promise<import("node:http").IncomingMessage>((resolve, reject) => {
        const req = request({hostname:candidate.address,family:candidate.family,port:443,
          servername:isIP(address.host) ? undefined : address.host,path:url.pathname+url.search,
          method:"GET",agent:false,signal,headers,maxHeaderSize:8192}, res => {clearTimeout(timer);resolve(res);});
        const timer=setTimeout(()=>req.destroy(new Error("Address connection timeout")),4000);
        req.on("error",error=>{clearTimeout(timer);reject(error);});
        req.end();
      });
    } catch { if (signal.aborted) signal.throwIfAborted(); }
  }
  throw new IngestionError("network");
}
