import type { TerraModeId, TerraPoint } from "@/lib/modes/types";

export type FavouriteRef = {
  modeId: TerraModeId;
  pointId: string;
};

export type FavouriteDto = FavouriteRef & {
  createdAt: string;
  listId: string;
  point: TerraPoint;
};

export type FavouriteListDto = {
  createdAt: string;
  id: string;
  itemCount: number;
  items: FavouriteDto[];
  name: string;
  updatedAt: string;
};

export type ModePersistenceAdapter = {
  hydrateFavouritePoints: (pointIds: string[]) => Promise<TerraPoint[]>;
  label: string;
  modeId: TerraModeId;
  recordClick: (userId: string, pointId: string) => Promise<{ clickCount: number } | null>;
  upsertFavouritePoint: (pointId: string) => Promise<TerraPoint | null>;
};
