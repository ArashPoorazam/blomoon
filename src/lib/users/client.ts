import type { FavouriteFolderSummaryDto } from "@/lib/persistence/types";
import type { ViewerDto } from "./dto";

export type ViewerResponse = {
  user: ViewerDto;
};

export type FavouritesResponse = {
  folders: FavouriteFolderSummaryDto[];
};
