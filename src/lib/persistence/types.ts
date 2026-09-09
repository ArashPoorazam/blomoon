import type { TerraModeId, TerraPoint } from "@/lib/modes/types";

export type FavouriteRef = {
  modeId: TerraModeId;
  pointId: string;
};

export type FavouriteFolderMembershipDto = FavouriteRef & {
  createdAt: string;
  folderId: string;
};

export type FavouriteFolderItemDto = FavouriteFolderMembershipDto & {
  point: TerraPoint;
};

export type FavouriteFolderSummaryDto = {
  modeId: TerraModeId;
  createdAt: string;
  description: string | null;
  id: string;
  importedAt: string | null;
  isDefault: boolean;
  isImported: boolean;
  isShared: boolean;
  itemCount: number;
  name: string;
  sharedAt: string | null;
  updatedAt: string;
};

export type FavouriteFolderDto = FavouriteFolderSummaryDto & {
  items: FavouriteFolderItemDto[];
};

export type SharedFolderPreviewDto = {
  description: string | null;
  itemCount: number;
  name: string;
  sampleStationNames: string[];
};

export type ModePersistenceAdapter = {
  hydratePoints: (pointIds: string[]) => Promise<TerraPoint[]>;
  isPointId: (pointId: string) => boolean;
  label: string;
  modeId: TerraModeId;
  recordClick: (userId: string, pointId: string) => Promise<{ clickCount: number } | null>;
  upsertPoint: (pointId: string) => Promise<TerraPoint | null>;
};

export type PlaybackHistoryItemDto = {
  playedAt: string;
  playedOn: string;
  point: TerraPoint;
};
