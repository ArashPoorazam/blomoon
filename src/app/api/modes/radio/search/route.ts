import { COUNTRY_PAGE_LIMIT, COUNTRY_PAGE_MAX_LIMIT, getRadioPointPage } from "@/lib/modes/radio";
import {
  normalizeRadioCountryCode,
  parseIntegerParam,
  parseRadioQuery,
  parseRadioSort
} from "@/lib/modes/radio/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseIntegerParam(searchParams, "limit", {
    defaultValue: COUNTRY_PAGE_LIMIT,
    max: COUNTRY_PAGE_MAX_LIMIT,
    min: 1
  });
  const offset = parseIntegerParam(searchParams, "offset", {
    defaultValue: 0,
    max: 100_000,
    min: 0
  });
  const query = parseRadioQuery(searchParams);
  const sort = parseRadioSort(searchParams);
  const countryCodeParam = searchParams.get("countryCode");
  const countryCode = countryCodeParam ? normalizeRadioCountryCode(countryCodeParam) : null;

  if (countryCodeParam && !countryCode) {
    return Response.json({ error: "Country code is invalid." }, { status: 400 });
  }

  if (limit.error || offset.error || query.error || sort.error) {
    return Response.json({ error: limit.error ?? offset.error ?? query.error ?? sort.error }, { status: 400 });
  }

  const page = await getRadioPointPage({
    countryCode,
    limit: limit.value,
    offset: offset.value,
    query: query.query,
    sort: sort.sort
  });

  return Response.json(page, {
    headers: {
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600"
    }
  });
}
