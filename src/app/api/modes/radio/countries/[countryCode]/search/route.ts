import { COUNTRY_PAGE_LIMIT, COUNTRY_PAGE_MAX_LIMIT, getRadioCountryPointPage } from "@/lib/modes/radio";
import { normalizeRadioCountryCode, parseIntegerParam, parseRadioQuery } from "@/lib/modes/radio/api";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ countryCode: string }> }
) {
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

  if (limit.error || offset.error || query.error) {
    return Response.json({ error: limit.error ?? offset.error ?? query.error }, { status: 400 });
  }

  const page = await getRadioCountryPointPage({
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
}
