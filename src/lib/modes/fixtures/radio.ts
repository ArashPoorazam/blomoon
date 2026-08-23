import type { DataSourceInfo, TerraPoint, TerraPointDetail } from "../types";

export const RADIO_FIXTURE_SOURCE: DataSourceInfo = {
  name: "Radio Browser",
  url: "https://www.radio-browser.info/",
  attribution: "Fallback fixture data shown because the live Radio Browser directory is unavailable.",
  lastUpdated: "2026-01-01T00:00:00.000Z",
  isFallback: true
};

type RadioFixtureRecord = {
  detail: TerraPointDetail;
  point: TerraPoint;
  streamUrl: string;
};

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

function createFixtureRecord(
  id: string,
  name: string,
  latitude: number,
  longitude: number,
  country: string,
  countryCode: string,
  language: string,
  codec: string,
  bitrate: string,
  tags: string,
  streamUrl: string,
  sourceUrl: string
): RadioFixtureRecord {
  const point: TerraPoint = {
    id,
    modeId: "radio",
    name,
    latitude,
    longitude,
    countryCode,
    prominence: 0.45,
    timestamp: FIXTURE_TIMESTAMP,
    summary: `${country} · ${language} · ${tags}`,
    metrics: {
      Bitrate: bitrate,
      Clicks: 0,
      Codec: codec,
      Country: country,
      Language: language,
      Tags: tags,
      Votes: 0
    }
  };

  return {
    point,
    detail: {
      ...point,
      fields: [
        { label: "Country", value: country },
        { label: "Language", value: language },
        { label: "Codec", value: codec },
        { label: "Bitrate", value: bitrate },
        { label: "Votes", value: "0" },
        { label: "Tags", value: tags }
      ],
      sourceUrl
    },
    streamUrl
  };
}

export const RADIO_FIXTURE_RECORDS: RadioFixtureRecord[] = [
  createFixtureRecord(
    "fixture-kexp",
    "KEXP",
    47.6239,
    -122.3545,
    "United States",
    "840",
    "English",
    "MP3",
    "128 kbps",
    "alternative, indie, public radio",
    "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",
    "https://www.kexp.org/"
  ),
  createFixtureRecord(
    "fixture-fip",
    "FIP",
    48.8566,
    2.3522,
    "France",
    "250",
    "French",
    "MP3",
    "128 kbps",
    "jazz, eclectic, public radio",
    "https://icecast.radiofrance.fr/fip-midfi.mp3",
    "https://www.radiofrance.fr/fip"
  ),
  createFixtureRecord(
    "fixture-somafm-groove-salad",
    "SomaFM Groove Salad",
    37.7749,
    -122.4194,
    "United States",
    "840",
    "English",
    "MP3",
    "128 kbps",
    "ambient, downtempo, electronic",
    "https://ice2.somafm.com/groovesalad-128-mp3",
    "https://somafm.com/groovesalad/"
  )
];
