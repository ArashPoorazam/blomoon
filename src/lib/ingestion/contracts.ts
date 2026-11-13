export const INGESTION_LIMITS = {
  timeoutMs: 15_000, workerMs: 20_000, wireBytes: 2 * 1024 * 1024, decodedBytes: 4 * 1024 * 1024,
  redirects: 3, depth: 32, nodes: 50_000, attributes: 32, textLength: 65_536,
  outputBytes: 12 * 1024 * 1024, hostConcurrency: 2, concurrency: 4, leaseSeconds: 60, attempts: 3,
} as const;
export type XmlNode = { name: string; attributes: Record<string, string>; text: string; children: XmlNode[] };
export type FetchInput = { url: string; origins: string[]; etag: string | null; lastModified: string | null; validatorUrl: string | null };
export type FetchResult = {
  status: "modified" | "not_modified"; finalUrl: string; etag: string | null; lastModified: string | null;
  bytes: number; document: XmlNode | null;
};
