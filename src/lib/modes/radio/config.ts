export const RADIO_BROWSER_DIRECTORY_URL = "https://all.api.radio-browser.info/json/servers";

export const RADIO_BROWSER_FALLBACK_HOSTS = [
  "de1.api.radio-browser.info",
  "nl1.api.radio-browser.info",
  "at1.api.radio-browser.info"
] as const;

export const RADIO_BROWSER_USER_AGENT = "Terravue/0.1 (+https://github.com/daedalus/terravue)";

export const STATION_CACHE_TTL_MS = 30 * 60 * 1000;
export const FALLBACK_CACHE_TTL_MS = 2 * 60 * 1000;
export const STREAM_CACHE_TTL_MS = 5 * 60 * 1000;
export const REQUEST_TIMEOUT_MS = 8_000;
export const STREAM_VALIDATION_TIMEOUT_MS = 5_000;

export const WORLD_MARKER_LIMIT = 1_000;
export const RADIO_PROVIDER_CATALOG_TIMEOUT_MS = 12_000;
export const RADIO_PROVIDER_WORLD_PAGE_CONCURRENCY = 4;
export const RADIO_PROVIDER_WORLD_PAGE_LIMIT = 100;
export const RADIO_PROVIDER_WORLD_SCAN_LIMIT = 5_000;
export const RADIO_PROVIDER_COUNTRY_COVERAGE_CONCURRENCY = 8;
export const RADIO_PROVIDER_COUNTRY_PAGE_LIMIT = 50;
export const COUNTRY_COVERAGE_LIMIT = 4;
export const COUNTRY_MARKER_LIMIT = 50;
export const COUNTRY_PAGE_LIMIT = 50;
export const COUNTRY_PAGE_MAX_LIMIT = 100;
