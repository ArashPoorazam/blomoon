import { normalizeSearchText } from "@/lib/search/text";
import type { RadioStationRecord } from "./types";

export type StationAlias = { stationId: string; canonicalId: string };

export function streamIdentity(value: string) {
  const url = new URL(value);
  url.hash = "";
  return url.toString();
}

export function stationIdentityKey(record: RadioStationRecord) {
  const name = normalizeSearchText(record.point.name)
    .replace(/(?:\s+(?:\d+\s*(?:kbps|kbit s|k)|mp3|aacplus|aac|ogg|opus|flac))+$/, "")
    .replace(/\s+/g, " ").trim();
  const homepage = record.detail.sourceUrl;
  if (!homepage || !name || name === "unnamed station") return `stream:${streamIdentity(record.streamUrl)}`;
  try {
    const url = new URL(homepage);
    if (!["http:", "https:"].includes(url.protocol)) return `stream:${streamIdentity(record.streamUrl)}`;
    // Keep website paths and channel names: a shared broadcaster domain is not identity.
    return `station:${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}${url.search}:${name}`;
  } catch {
    return `stream:${streamIdentity(record.streamUrl)}`;
  }
}

/** Group only evidenced aliases, never fuzzy names. Existing IDs survive catalog refreshes. */
export function canonicalizeRadioRecords(records: RadioStationRecord[], previous: StationAlias[] = []) {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.has(root) && parent.get(root) !== root) root = parent.get(root)!;
    while (id !== root) {
      const next = parent.get(id)!;
      parent.set(id, root);
      id = next;
    }
    return root;
  };
  const join = (a: string, b: string) => { parent.set(find(a), find(b)); };
  const keys = new Map<string, string>();
  const old = new Map(previous.map((alias) => [alias.stationId, alias.canonicalId]));
  for (const record of records) {
    const id = record.point.id;
    const canonicalId = old.get(id);
    if (canonicalId) join(id, canonicalId);
    for (const key of [stationIdentityKey(record), `stream:${streamIdentity(record.streamUrl)}`]) {
      const existing = keys.get(key);
      if (existing) join(id, existing);
      else keys.set(key, id);
    }
  }
  const groups = new Map<string, RadioStationRecord[]>();
  for (const record of records) {
    const root = find(record.point.id);
    const group = groups.get(root) ?? [];
    group.push(record);
    groups.set(root, group);
  }
  const aliases: StationAlias[] = [];
  const canonicalRecords = [...groups.values()].map((group) => {
    group.sort((a, b) => b.votes - a.votes || b.clickCount - a.clickCount || a.point.id.localeCompare(b.point.id));
    const retained = [...new Set(group.flatMap((record) => old.get(record.point.id) ?? []))].sort();
    const canonicalId = retained[0] ?? group[0].point.id;
    for (const record of group) aliases.push({ stationId: record.point.id, canonicalId });
    const representative = group.find((record) => record.point.id === canonicalId) ?? group[0];
    return { ...representative, point: { ...representative.point, id: canonicalId }, detail: { ...representative.detail, id: canonicalId } };
  });
  return { records: canonicalRecords, aliases };
}
