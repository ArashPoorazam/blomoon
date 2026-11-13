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

export async function fetchDocument(input: FetchInput, acquire: HostSlot, cancellation: AbortSignal): Promise<FetchedDocument> {
  const deadline = AbortSignal.timeout(limits.timeoutMs);
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
        const headers: Record<string, string> = { Host: url.host, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml", "Accept-Encoding": "gzip, deflate, br", "User-Agent": "Blomoon ingestion/1.0" };
        if (conditional && validator(input.etag)) headers["If-None-Match"] = input.etag!;
        if (conditional && validator(input.lastModified)) headers["If-Modified-Since"] = input.lastModified!;
        const res = await new Promise<import("node:http").IncomingMessage>((resolve, reject) => {
          const req = request({ hostname: address.address, family: address.family, port: 443,
            servername: isIP(address.host) ? undefined : address.host, path: url.pathname + url.search,
            method: "GET", agent: false, signal, headers, maxHeaderSize: 8192 }, resolve);
          req.on("error", reject);
          req.end();
        });
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
          if (type && !/^(?:application\/(?:[\w.+-]+\+)?xml|text\/xml)(?:\s*;|$)/i.test(type)) throw new IngestionError("http_error");
          const charset = type.match(/charset\s*=\s*["']?([^;\s"']+)/i)?.[1];
          if (charset && !/^utf-?8$/i.test(charset)) throw new IngestionError("encoding");
          if (Number(res.headers["content-length"]) > limits.wireBytes) throw new IngestionError("too_large");
          const body = await readBody(res, res.headers["content-encoding"], signal);
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

async function readBody(source: Readable, encoding: string | undefined, signal: AbortSignal) {
  let wire = 0, decoded = 0;
  const chunks: Buffer[] = [];
  const boundWire = new Transform({ transform(chunk: Buffer, _encoding, callback) {
    wire += chunk.length;
    callback(wire > limits.wireBytes ? new IngestionError("too_large") : null, chunk);
  } });
  const sink = new Writable({ write(chunk: Buffer, _encoding, callback) {
    decoded += chunk.length;
    if (decoded > limits.decodedBytes) return callback(new IngestionError("too_large"));
    chunks.push(chunk); callback();
  } });
  const normalized = encoding?.trim().toLowerCase();
  const decompress = !normalized || normalized === "identity" ? null : normalized === "gzip" ? createGunzip() : normalized === "deflate" ? createInflate() : normalized === "br" ? createBrotliDecompress() : undefined;
  if (decompress === undefined) throw new IngestionError("encoding");
  await pipeline(decompress ? [source, boundWire, decompress, sink] : [source, boundWire, sink], { signal });
  return Buffer.concat(chunks, decoded);
}
