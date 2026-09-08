import { findCountryByCode } from "@/lib/geo";

export const RADIO_SORT_OPTIONS = ["votes_desc", "votes_asc", "relevance"] as const;

export type RadioSortOption = typeof RADIO_SORT_OPTIONS[number];

export type ParsedIntegerParam = {
  error: string | null;
  value: number;
};

export function normalizeRadioCountryCode(value: string) {
  return findCountryByCode(value)?.code ?? null;
}

export function parseIntegerParam(
  searchParams: URLSearchParams,
  key: string,
  { defaultValue, max, min }: { defaultValue: number; max: number; min: number }
): ParsedIntegerParam {
  const rawValue = searchParams.get(key);

  if (rawValue === null) {
    return {
      error: null,
      value: defaultValue
    };
  }

  const value = /^\d+$/.test(rawValue) ? Number(rawValue) : NaN;

  if (!Number.isInteger(value) || value < min || value > max) {
    return {
      error: `${key} must be an integer from ${min} to ${max}.`,
      value: defaultValue
    };
  }

  return {
    error: null,
    value
  };
}

export function parseRadioQuery(searchParams: URLSearchParams) {
  const query = (searchParams.get("q") ?? "").trim();

  return query.length <= 120
    ? { error: null, query }
    : { error: "q must be 120 characters or fewer.", query: "" };
}

export function parseRadioSort(searchParams: URLSearchParams) {
  const value = searchParams.get("sort") ?? (searchParams.get("q")?.trim() ? "relevance" : "votes_desc");

  return isRadioSortOption(value)
    ? { error: null, sort: value }
    : { error: "sort must be votes_desc, votes_asc, or relevance.", sort: "votes_desc" as RadioSortOption };
}

export function isRadioStationId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isRadioSortOption(value: string): value is RadioSortOption {
  return RADIO_SORT_OPTIONS.includes(value as RadioSortOption);
}
