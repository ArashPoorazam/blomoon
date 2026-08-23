import { findCountryByCode } from "@/lib/geo";

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

  const value = Number.parseInt(rawValue, 10);

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
