export const RADIO_BROWSER_DIRECTORY_URL = "https://all.api.radio-browser.info/json/servers";

export const RADIO_BROWSER_FALLBACK_HOSTS = [
  "de1.api.radio-browser.info"
] as const;

export const RADIO_BROWSER_USER_AGENT = "Blomoon/0.1 (+https://github.com/daedalus/blomoon)";

export const STATION_CACHE_TTL_MS = 30 * 60 * 1000;
export const FALLBACK_CACHE_TTL_MS = 2 * 60 * 1000;
export const REQUEST_TIMEOUT_MS = 8_000;

export const COUNTRY_MARKER_LIMIT = 50;
export const COUNTRY_PAGE_LIMIT = 50;
export const COUNTRY_PAGE_MAX_LIMIT = 100;
