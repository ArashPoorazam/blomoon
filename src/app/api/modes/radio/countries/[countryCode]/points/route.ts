import { getRadioCountryMarkerDataset, COUNTRY_MARKER_LIMIT } from "@/lib/modes/radio";
import { normalizeRadioCountryCode, parseIntegerParam } from "@/lib/modes/radio/api";

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
    defaultValue: COUNTRY_MARKER_LIMIT,
    max: COUNTRY_MARKER_LIMIT,
    min: 1
  });

  if (limit.error) {
    return Response.json({ error: limit.error }, { status: 400 });
  }

  const dataset = await getRadioCountryMarkerDataset(normalizedCountryCode);

  return Response.json({
    ...dataset,
    points: dataset.points.slice(0, limit.value)
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600"
    }
  });
}
