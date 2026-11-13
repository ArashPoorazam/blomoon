// Bundled standalone: no database modules, credentials, filesystem configuration or application imports.
import { setTimeout as delay } from "node:timers/promises";
import { fetchDocument, type HostSlot } from "./fetch";
import { INGESTION_LIMITS as limits, type FetchInput, type FetchResult } from "./contracts";
import { parseXml } from "./xml";
import { IngestionError, failureCode } from "./errors";

let sequence = 0;
const replies = new Map<number, (granted: boolean) => void>();
function rpc(action: "acquire" | "release", host: string): Promise<boolean> {
  const id = ++sequence;
  return new Promise(resolve => {
    replies.set(id, resolve);
    process.send?.({ type: "slot", id, action, host });
  });
}
const acquire: HostSlot = async (host, signal) => {
  while (!await rpc("acquire", host)) await delay(100 + Math.random() * 150, undefined, { signal });
  return async () => { await rpc("release", host); };
};
async function send(message: unknown) {
  await new Promise<void>((resolve, reject) => {
    if (!process.send) return reject(new Error("Missing IPC channel"));
    process.send(message, error => error ? reject(error) : resolve());
  });
}
let started = false;
process.on("message", async (message: { type: string; id?: number; granted?: boolean; input?: FetchInput; kind?: "feed" | "guide" }) => {
  if (message.type === "slot" && typeof message.id === "number") {
    replies.get(message.id)?.(Boolean(message.granted)); replies.delete(message.id); return;
  }
  if (message.type !== "start" || started || !message.input) return;
  started = true;
  try {
    const result = await fetchDocument(message.input, acquire, AbortSignal.timeout(message.input.largePodcastFeed && message.input.url === "https://feeds.jupiterbroadcasting.com/lup" ? 45_000 : limits.workerMs));
    // Parsing has no reason to retain filesystem or network privileges.
    process.permission?.drop("net");
    process.permission?.drop("fs.read");
    const document = result.status === "modified" ? parseXml(result.body, message.input.largePodcastFeed === true && message.input.url === "https://feeds.jupiterbroadcasting.com/lup") : null;
    if (document && !(message.kind === "guide" ? document.name === "tv" : ["rss", "feed", "rdf:RDF"].includes(document.name))) throw new IngestionError("invalid_xml");
    const output: FetchResult = { status: result.status, finalUrl: result.finalUrl, etag: result.etag, lastModified: result.lastModified, bytes: result.body.length, document };
    if (Buffer.byteLength(JSON.stringify(output)) > limits.outputBytes) throw new IngestionError("too_large");
    await send({ type: "result", result: output });
  } catch (error) { await send({ type: "error", code: failureCode(error) }).catch(() => {}); }
  finally { process.disconnect?.(); }
});
