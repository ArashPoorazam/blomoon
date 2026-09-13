import "server-only";
import { acquireHostSlot } from "./hostSlots";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";
import { abortable } from "@/lib/abort";
import { recognizeOgg, recognizeWave } from "./audioContainers";

export type ProbeFailure =
  | "unsafe_address"
  | "unsupported_format"
  | "redirect"
  | "restricted"
  | "http_error"
  | "unrecognized_audio"
  | "redirect_limit"
  | "timeout"
  | "connection_failed";
export type ProbeResult = { ok: boolean; reason: ProbeFailure | null; bytes: number };
const denied = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
] as const)
  denied.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
] as const)
  denied.addSubnet(address, prefix, "ipv6");
export function isPublicAddress(address: string) {
  const family = isIP(address);
  return family === 4
    ? !denied.check(address, "ipv4")
    : family === 6 && /^[23][0-9a-f]{3}:/i.test(address) && !denied.check(address, "ipv6");
}

/** Recognize audio framing, never certify audio by HTTP headers alone. */
export function recognizeAudio(data: Buffer) {
  if (data.subarray(0, 4).toString() === "OggS")
    return recognizeOgg(data);
  if (data.subarray(0, 4).toString() === "RIFF")
    return recognizeWave(data);
  for (let i = 0; i < data.length - 8; i++) {
    if (data[i] !== 255) continue;
    // ADTS AAC: verify a second frame at the encoded frame length.
    if ((data[i + 1] & 0xf6) === 0xf0 && ((data[i + 2] >> 2) & 15) < 13) {
      const size = ((data[i + 3] & 3) << 11) | (data[i + 4] << 3) | (data[i + 5] >> 5);
      if (
        size >= 7 &&
        i + size + 1 < data.length &&
        data[i + size] === 255 &&
        (data[i + size + 1] & 0xf6) === 0xf0
      )
        return true;
    }
    // MPEG layer III, with valid version, sample rate and bitrate plus next frame.
    const version = (data[i + 1] >> 3) & 3,
      layer = (data[i + 1] >> 1) & 3,
      rate = (data[i + 2] >> 2) & 3,
      bit = data[i + 2] >> 4;
    if (
      (data[i + 1] & 0xe0) !== 0xe0 ||
      version === 1 ||
      layer !== 1 ||
      rate === 3 ||
      bit === 0 ||
      bit === 15
    )
      continue;
    const bitrate =
      (version === 3
        ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
        : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160])[bit] * 1000;
    const sample = [44100, 48000, 32000][rate] / (version === 3 ? 1 : version === 2 ? 2 : 4);
    const size = Math.floor(((version === 3 ? 144 : 72) * bitrate) / sample) + ((data[i + 2] >> 1) & 1);
    if (
      i + size + 1 < data.length &&
      data[i + size] === 255 &&
      (data[i + size + 1] & 0xfe) === (data[i + 1] & 0xfe)
    )
      return true;
  }
  return false;
}

export async function probeStream(raw: string, timeoutMs = 10_000, maxBytes = 65_536): Promise<ProbeResult> {
  const signal = AbortSignal.timeout(timeoutMs);
  let bytes = 0;
  try {
    let url = new URL(raw);
    for (let redirects = 0; redirects <= 3; redirects++) {
      if (url.protocol !== "https:" || url.username || url.password)
        return { ok: false, reason: "unsafe_address", bytes };
      if (/\.(m3u8?|pls|asx)$/i.test(url.pathname)) return { ok: false, reason: "unsupported_format", bytes };
      const host = url.hostname.replace(/^\[|\]$/g, "");
      const addresses = isIP(host)
        ? [{ address: host, family: isIP(host) }]
        : await abortable(lookup(host, { all: true }), signal);
      if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
        return { ok: false, reason: "unsafe_address", bytes };
      // Prefer IPv4 on hosts whose servers lack an IPv6 route. All answers were validated above.
      addresses.sort((a, b) => a.family - b.family);
      const release = await acquireHostSlot(host, signal);
      const response = await new Promise<{ location?: string; ok: boolean; reason: ProbeFailure | null }>(
        (resolve, reject) => {
          const req = request(
            {
              hostname: addresses[0].address,
              family: addresses[0].family,
              port: url.port || 443,
              servername: isIP(host) ? undefined : host,
              path: url.pathname + url.search,
              method: "GET",
              agent: false,
              signal,
              headers: {
                Host: url.host,
                "User-Agent": "Blomoon stream health/1.0",
                Accept: "audio/*",
                "Accept-Encoding": "identity",
              },
            },
            (res) => {
              const finish = (result: { location?: string; ok: boolean; reason: ProbeFailure | null }) => {
                resolve(result);
                res.destroy();
                req.destroy();
              };
              if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode))
                return finish({ location: res.headers.location, ok: false, reason: "redirect" });
              if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300)
                return finish({ ok: false, reason: res.statusCode === 403 ? "restricted" : "http_error" });
              if (
                /(?:text\/html|application\/(?:json|.*mpegurl)|audio\/.*mpegurl)/i.test(
                  String(res.headers["content-type"]),
                )
              )
                return finish({ ok: false, reason: "unsupported_format" });
              const chunks: Buffer[] = [];
              res.on("data", (chunk: Buffer) => {
                const remaining = maxBytes - bytes;
                const part = chunk.subarray(0, remaining);
                bytes += part.length;
                chunks.push(part);
                if (recognizeAudio(Buffer.concat(chunks))) return finish({ ok: true, reason: null });
                if (bytes >= maxBytes) finish({ ok: false, reason: "unrecognized_audio" });
              });
              res.on("end", () => finish({ ok: false, reason: "unrecognized_audio" }));
              res.on("error", reject);
            },
          );
          req.on("error", reject);
          req.end();
        },
      ).finally(release);
      if (!response.location) return { ok: response.ok, reason: response.reason, bytes };
      url = new URL(response.location, url);
    }
    return { ok: false, reason: "redirect_limit", bytes };
  } catch {
    return { ok: false, reason: signal.aborted ? "timeout" : "connection_failed", bytes };
  }
}
