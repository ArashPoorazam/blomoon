import type { FavouriteGroupDto } from "@/lib/persistence/types";
import type { ViewerDto } from "./dto";

export type ViewerResponse = {
  user: ViewerDto;
};

export type FavouritesResponse = {
  groups: FavouriteGroupDto[];
};
