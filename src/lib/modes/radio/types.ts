import type { TerraPlayableAudio, TerraPoint, TerraPointDetail } from "../types";

export type RadioBrowserServer = {
  name?: string;
};

export type RadioBrowserCountRecord = {
  iso_3166_1?: string;
  name?: string;
  stationcount?: number | string;
};

export type RadioBrowserLanguage = {
  iso_639?: string | null;
  name?: string;
  stationcount?: number | string;
};

export type RadioBrowserStation = {
  stationuuid?: string;
  name?: string;
  url?: string;
  url_resolved?: string;
  homepage?: string;
  favicon?: string;
  tags?: string;
  country?: string;
  countrycode?: string;
  state?: string;
  language?: string;
  languagecodes?: string;
  votes?: number | string;
  clickcount?: number | string;
  codec?: string;
  bitrate?: number | string;
  lastcheckok?: number | string;
  lastchecktime_iso8601?: string;
  lastcheckoktime_iso8601?: string;
  geo_lat?: number | string | null;
  geo_long?: number | string | null;
};

export type RadioBrowserStats = {
  stations?: number | string;
  stations_broken?: number | string;
};

export type RadioBrowserTag = {
  name?: string;
  stationcount?: number | string;
};

export type RadioClickResponse = {
  ok?: boolean;
  url?: string;
};

export type RadioStationRecord = {
  clickCount: number;
  detail: TerraPointDetail;
  point: TerraPoint & { countryCode: string };
  searchText: string;
  streamUrl: string;
  votes: number;
};

export type RadioStationPersistenceSnapshot = {
  bitrate: number | null;
  clickCount: number;
  codec: string | null;
  country: string;
  countryCode: string;
  id: string;
  language: string | null;
  latitude: number;
  locationPrecision: "station" | "country";
  longitude: number;
  metrics: Record<string, string | number | null>;
  name: string;
  sourceUrl: string | null;
  streamUrl: string;
  summary: string;
  tags: string[];
  timestamp: string | null;
  votes: number;
};

export type PlayableCacheEntry = {
  fetchedAt: number;
  stream: TerraPlayableAudio;
};
