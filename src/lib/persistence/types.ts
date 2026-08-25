import type { TerraModeId, TerraPoint } from "@/lib/modes/types";

export type FavouriteRef = {
  modeId: TerraModeId;
  pointId: string;
};

export type FavouriteDto = FavouriteRef & {
  createdAt: string;
  point: TerraPoint;
};

export type FavouriteGroupDto = {
  label: string;
  modeId: TerraModeId;
  favourites: FavouriteDto[];
};

export type ModePersistenceAdapter = {
  label: string;
  modeId: TerraModeId;
  addFavourite: (userId: string, pointId: string) => Promise<FavouriteDto | null>;
  listFavourites: (userId: string) => Promise<FavouriteDto[]>;
  removeFavourite: (userId: string, pointId: string) => Promise<boolean>;
  recordClick: (userId: string, pointId: string) => Promise<{ clickCount: number } | null>;
};
