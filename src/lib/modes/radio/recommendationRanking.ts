import { normalizeSearchText } from "@/lib/search/text";
import type { TerraPoint } from "../types";
import type { RadioStationRecord } from "./types";

export type RadioPreferenceSignal = { point: TerraPoint; saved: boolean; playedAt: string[] };
type Features = { tags: string[]; languages: string[]; country: string };
type Candidate = { record: RadioStationRecord; streamKey: string; features: Features; score: number; exploration: number; familiar: boolean };

function features(point: TerraPoint): Features {
  const values = (key: string) => [...new Set(String(point.metrics?.[key] ?? "").split(",")
    .map(normalizeSearchText).filter((value) => value && value !== "unknown" && value !== "untagged"))];
  return { tags: values("Tags"), languages: values("Language"), country: point.countryCode ?? "" };
}

export function signalWeight(signal: RadioPreferenceSignal, now: number) {
  const recent = signal.playedAt.reduce((sum, date) => {
    const age = Math.max(0, now - Date.parse(date));
    return sum + (Number.isFinite(age) ? 2 ** (-age / (14 * 86400000)) : 0);
  }, 0);
  return (signal.saved ? 4 : 0) + Math.min(3, recent);
}

export function rankRadioRecommendations(records: RadioStationRecord[], signals: RadioPreferenceSignal[], now = Date.now(), limit = 500) {
  const tags = new Map<string, number>();
  const languages = new Map<string, number>();
  const countries = new Map<string, number>();
  const known = new Set(signals.map(({ point }) => point.id));
  const add = (map: Map<string, number>, values: string[], weight: number) => {
    for (const value of values) map.set(value, (map.get(value) ?? 0) + weight / values.length);
  };
  for (const signal of signals) {
    const value = features(signal.point);
    const weight = signalWeight(signal, now);
    add(tags, value.tags, weight); add(languages, value.languages, weight);
    if (value.country) add(countries, [value.country], weight);
  }
  const frequencies = new Map<string, number>();
  const enriched = records.map((record) => ({ record, features: features(record.point) }));
  for (const item of enriched) for (const tag of item.features.tags) frequencies.set(tag, (frequencies.get(tag) ?? 0) + 1);
  for (const [tag, weight] of tags) tags.set(tag, weight * Math.log(1 + records.length / (1 + (frequencies.get(tag) ?? 0))));
  for (const map of [tags, languages, countries]) {
    const maximum = Math.max(0, ...map.values());
    if (maximum) for (const [key, value] of map) map.set(key, value / maximum);
  }
  const affinity = (map: Map<string, number>, values: string[]) => values.length
    ? values.reduce((sum, value) => sum + (map.get(value) ?? 0), 0) / values.length : 0;
  const personalized = [tags, languages, countries].some((map) => map.size > 0);
  const popularity = (record: RadioStationRecord) => Math.log1p(Math.max(0, record.votes) * 5 + Math.max(0, record.clickCount));
  const maxPopularity = Math.max(1, ...records.map(popularity));
  const day = new Date(now).toISOString().slice(0, 10);
  const candidates: Candidate[] = enriched.map(({ record, features: value }) => {
    const quality = popularity(record) / maxPopularity;
    const preference = 0.6 * affinity(tags, value.tags) + 0.25 * affinity(languages, value.languages)
      + 0.15 * (countries.get(value.country) ?? 0);
    return { record, streamKey: streamIdentity(record.streamUrl), features: value, familiar: known.has(record.point.id),
      score: personalized ? 0.9 * preference + 0.1 * quality : 0.5 * quality + 0.5 * seededValue(day + record.point.id),
      exploration: 0.2 * quality + 0.8 * seededValue(day + record.point.id) };
  });
  const byScore = (a: Candidate, b: Candidate) => b.score - a.score || a.record.point.id.localeCompare(b.record.point.id);
  const discovery = candidates.filter((item) => !item.familiar).sort(byScore).slice(0, 3000);
  const familiar = candidates.filter((item) => item.familiar).sort(byScore);
  const explore = candidates.filter((item) => !item.familiar)
    .sort((a, b) => b.exploration - a.exploration || byScore(a, b)).slice(0, 3000);
  const used = new Set<string>();
  const streams = new Set<string>();
  const countryCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const result: TerraPoint[] = [];
  function pick(pool: Candidate[], exploring: boolean) {
    let best = -1;
    let score = -Infinity;
    let inspected = 0;
    for (let index = 0; index < pool.length && inspected < 100; index++) {
      const item = pool[index];
      if (used.has(item.record.point.id) || streams.has(item.streamKey)) continue;
      inspected++;
      const repetition = 0.04 * (countryCounts.get(item.features.country) ?? 0)
        + 0.02 * item.features.tags.reduce((max, tag) => Math.max(max, tagCounts.get(tag) ?? 0), 0);
      const adjusted = (exploring ? item.exploration : item.score) - repetition;
      if (adjusted > score) { best = index; score = adjusted; }
    }
    if (best < 0) return false;
    const [item] = pool.splice(best, 1);
    used.add(item.record.point.id); streams.add(item.streamKey);
    countryCounts.set(item.features.country, (countryCounts.get(item.features.country) ?? 0) + 1);
    for (const tag of item.features.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    result.push(item.record.point);
    return true;
  }
  // Interleave 7 discoveries, 2 familiar stations, 1 exploration in every ten slots.
  while (result.length < limit) {
    const slot = result.length % 10;
    const pool = personalized && (slot === 3 || slot === 7) ? familiar : slot === 9 ? explore : discovery;
    if (!pick(pool, pool === explore) && !pick(discovery, false) && !pick(familiar, false) && !pick(explore, true)) break;
  }
  return { points: result, personalized };
}

export function streamIdentity(value: string) {
  const url = new URL(value);
  url.hash = "";
  return url.toString();
}

function seededValue(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0) / 4294967296;
}
