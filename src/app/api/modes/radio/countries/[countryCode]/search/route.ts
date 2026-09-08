import { COUNTRY_PAGE_LIMIT, COUNTRY_PAGE_MAX_LIMIT } from "@/lib/modes/radio";
import { searchRadioStations } from "@/lib/modes/radio/search";
import { normalizeRadioCountryCode, parseIntegerParam, parseRadioQuery, parseRadioSort } from "@/lib/modes/radio/api";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";

export const GET = withApiLogging("api.modes.radio.countries.search", async (
  request: Request,
  { params }: { params: Promise<{ countryCode: string }> }
) => {
  const { countryCode } = await params;
  const normalizedCountryCode = normalizeRadioCountryCode(countryCode);

  if (!normalizedCountryCode) {
    return Response.json({ error: "Country code is invalid." }, { status: 400 });
  }

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

  if (limit.error || offset.error || query.error || sort.error) {
    return Response.json({ error: limit.error ?? offset.error ?? query.error ?? sort.error }, { status: 400 });
  }

  const page = await searchRadioStations({
    sort: sort.sort,
    countryCode: normalizedCountryCode,
    limit: limit.value,
    offset: offset.value,
    query: query.query
  });

  return Response.json(page, {
    headers: {
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600"
    }
  });
}, {
  context: async (_request, { params }) => {
    const { countryCode } = await params;
    return { countryCode };
  }
});
