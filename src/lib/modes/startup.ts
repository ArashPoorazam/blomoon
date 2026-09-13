import "server-only";
import type { TerraDataset } from "./types";
import { getRadioStartupDataset } from "./radio";
const loaders: Record<string, () => Promise<TerraDataset>> = {
  radio: getRadioStartupDataset,
};
export async function getStartupDatasets(ids: string[]) {
  const entries = await Promise.all(
    ids
      .filter((id) => loaders[id])
      .map(async (id) => [id, await loaders[id]()] as const),
  );
  return Object.fromEntries(entries);
}
