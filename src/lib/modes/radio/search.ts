import "server-only";
import { searchRadioDirectory } from "./directory";
import { getRadioPointPage } from "./catalog";
import type { RadioSortOption } from "./api";

export async function searchRadioStations(params: {
  countryCode: string | null; query: string; sort: RadioSortOption; limit: number; offset: number;
}) {
  const directoryPage = await searchRadioDirectory(params);
  if (directoryPage) return directoryPage;
  // Isolated bootstrap fallback: removable once full-catalog operation is mandatory.
  const page = await getRadioPointPage({ ...params, sort: params.sort === "relevance" ? "votes_desc" : params.sort });
  return { ...page, source: { ...page.source, notice: "Full catalog is not ready. Search coverage and typo matching are limited." } };
}
