import atlasCountries from "./countries.json";
import {
  ISO_ALPHA2_BY_NUMERIC_COUNTRY_CODE,
  ISO_NUMERIC_BY_ALPHA2_COUNTRY_CODE
} from "./isoCountries";

export type CountryInfo = {
  code: string;
  name: string;
};

let cachedCountryByCode: Map<string, CountryInfo> | null = null;
let cachedCountryByName: Map<string, CountryInfo> | null = null;
let cachedAlphaCodeByCountryCode: Map<string, string> | null = null;

const atlasRegionOverrides: ReadonlyMap<string, CountryInfo> = new Map([
  ["kosovo", { code: "X-KOSOVO", name: "Kosovo" }],
  ["north cyprus", { code: "X-NORTH-CYPRUS", name: "North Cyprus" }],
  ["somaliland", { code: "X-SOMALILAND", name: "Somaliland" }]
] as const);

const countryCodeAliases: ReadonlyMap<string, string> = new Map([
  ["XK", "X-KOSOVO"],
  ["XKX", "X-KOSOVO"]
] as const);

const countryNameAliases: ReadonlyMap<string, string> = new Map([
  ["bosnia and herzegovina", "bosnia and herz"],
  ["central african republic", "central african rep"],
  ["congo democratic republic of the", "dem rep congo"],
  ["czech republic", "czechia"],
  ["democratic republic of the congo", "dem rep congo"],
  ["dominican republic", "dominican rep"],
  ["equatorial guinea", "eq guinea"],
  ["iran islamic republic of", "iran"],
  ["lao people s democratic republic", "laos"],
  ["moldova republic of", "moldova"],
  ["n cyprus", "north cyprus"],
  ["northern cyprus", "north cyprus"],
  ["north macedonia", "macedonia"],
  ["republic of the congo", "congo"],
  ["russian federation", "russia"],
  ["syrian arab republic", "syria"],
  ["tanzania united republic of", "tanzania"],
  ["turkiye", "turkey"],
  ["uk", "united kingdom"],
  ["united states", "united states of america"],
  ["usa", "united states of america"],
  ["venezuela bolivarian republic of", "venezuela"],
  ["viet nam", "vietnam"]
] as const);

const regionDisplayNames = typeof Intl.DisplayNames === "function"
  ? new Intl.DisplayNames(["en"], { type: "region" })
  : null;

export function findCountryByCode(code?: string | null): CountryInfo | null {
  const normalizedCode = normalizeKnownCountryCode(code);
  return normalizedCode ? getCountryByCode().get(normalizedCode) ?? null : null;
}

export function getKnownCountries(): CountryInfo[] {
  return Array.from(getCountryByCode().values());
}

export function normalizeCountryCode(code?: string | null, displayName?: string | null) {
  const knownCode = normalizeKnownCountryCode(code);

  if (knownCode && getCountryByCode().has(knownCode)) {
    return knownCode;
  }

  const alphaCode = normalizeAlphaCountryCode(code);
  const numericCode = alphaCode ? ISO_NUMERIC_BY_ALPHA2_COUNTRY_CODE.get(alphaCode) : null;

  if (numericCode && getCountryByCode().has(numericCode)) {
    return numericCode;
  }

  if (displayName) {
    const country = findCountryByName(displayName);

    if (country) {
      return country.code;
    }
  }

  if (!alphaCode || !regionDisplayNames) {
    return undefined;
  }

  const country = findCountryByName(regionDisplayNames.of(alphaCode));
  return country?.code;
}

export function getAlphaCountryCode(code?: string | null) {
  const country = findCountryByCode(code);

  if (!country) {
    return null;
  }

  return ISO_ALPHA2_BY_NUMERIC_COUNTRY_CODE.get(country.code) ?? getAlphaCodeByCountryCode().get(country.code) ?? null;
}

function getCountryByCode() {
  if (cachedCountryByCode) {
    return cachedCountryByCode;
  }

  cachedCountryByCode = new Map();
  for (const country of getAtlasCountries()) {
    // The atlas repeats Australia's code for Ashmore and Cartier Islands.
    // Retain the primary country name instead of replacing it with a territory.
    if (!cachedCountryByCode.has(country.code)) cachedCountryByCode.set(country.code, country);
  }

  return cachedCountryByCode;
}

function findCountryByName(value?: string | null) {
  if (!value) {
    return null;
  }

  return getCountryByName().get(normalizeCountryName(value)) ?? null;
}

function getCountryByName() {
  if (cachedCountryByName) {
    return cachedCountryByName;
  }

  const countryByName = new Map<string, CountryInfo>();

  getAtlasCountries().forEach((country) => {
    const info = getCountryByCode().get(country.code)!;
    const normalizedName = normalizeCountryName(country.name);

    countryByName.set(normalizedName, info);

    countryNameAliases.forEach((canonicalName, alias) => {
      if (canonicalName === normalizedName) {
        countryByName.set(alias, info);
      }
    });
  });

  cachedCountryByName = countryByName;
  return cachedCountryByName;
}

function getAlphaCodeByCountryCode() {
  if (cachedAlphaCodeByCountryCode) {
    return cachedAlphaCodeByCountryCode;
  }

  const alphaCodeByCountryCode = new Map<string, string>();

  ISO_ALPHA2_BY_NUMERIC_COUNTRY_CODE.forEach((alphaCode, numericCode) => {
    if (getCountryByCode().has(numericCode)) {
      alphaCodeByCountryCode.set(numericCode, alphaCode);
      return;
    }

    const countryCode = normalizeCountryCode(alphaCode);

    if (countryCode) {
      alphaCodeByCountryCode.set(countryCode, alphaCode);
    }
  });

  cachedAlphaCodeByCountryCode = alphaCodeByCountryCode;
  return cachedAlphaCodeByCountryCode;
}

export function countryInfoFromAtlas(id: string | number | undefined, name: string): CountryInfo | null {
  const countryId = typeof id === "string" ? id : String(id ?? "");
  const numericCode = normalizeIsoNumericCountryCode(countryId);

  if (numericCode) {
    return {
      code: numericCode,
      name
    };
  }

  return atlasRegionOverrides.get(normalizeCountryName(name)) ?? null;
}

function normalizeIsoNumericCountryCode(value?: string | null) {
  const normalized = (value ?? "").trim();
  return /^\d{1,3}$/.test(normalized) ? normalized.padStart(3, "0") : null;
}

function normalizeKnownCountryCode(value?: string | null) {
  const numericCode = normalizeIsoNumericCountryCode(value);

  if (numericCode) {
    return numericCode;
  }

  const normalized = (value ?? "").trim().toUpperCase();
  return countryCodeAliases.get(normalized) ?? (getCountryByCode().has(normalized) ? normalized : null);
}

function normalizeAlphaCountryCode(value?: string | null) {
  const normalized = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function normalizeCountryName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

  return countryNameAliases.get(normalized) ?? normalized;
}

function getAtlasCountries(): CountryInfo[] {
  return atlasCountries.flatMap(({ id, name }) => {
    const info = countryInfoFromAtlas(id ?? undefined, name);
    return info ? [info] : [];
  });
}
