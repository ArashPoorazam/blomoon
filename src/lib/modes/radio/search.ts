import "server-only";
import { searchRadioDirectory } from "./directory";
import type { RadioSortOption } from "./api";

export async function searchRadioStations(params: {
  countryCode: string | null; query: string; sort: RadioSortOption; limit: number; offset: number;
}) {
  return searchRadioDirectory(params);
}
