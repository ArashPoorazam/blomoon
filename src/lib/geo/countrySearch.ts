import { findCountryByCode, getAlphaCountryCode } from "../geo";
import { matchesSearchText } from "../search/text";

const aliases: Readonly<Record<string, string>> = {
  "840": "USA US United States United States of America",
  "826": "UK GB Britain Great Britain United Kingdom",
  "276": "Germany Deutschland",
  "364": "Iran ایران",
  "643": "Russia Russian Federation",
  "410": "South Korea Republic of Korea",
  "408": "North Korea",
  "203": "Czechia Czech Republic",
  "784": "UAE United Arab Emirates",
};

export function countrySearchText(code: string) {
  return [findCountryByCode(code)?.name, code, getAlphaCountryCode(code), aliases[code]].filter(Boolean).join(" ");
}

export function matchesCountrySearch(code: string, query: string) {
  return matchesSearchText(countrySearchText(code), query);
}
