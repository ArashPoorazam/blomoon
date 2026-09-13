import type {
  AdminModeDescriptor,
  CatalogPage,
  CatalogQuery,
} from "./contracts";
export interface AdminModeAdapter {
  descriptor: AdminModeDescriptor;
  list(query: CatalogQuery): Promise<CatalogPage>;
  detail(id: string): Promise<{ id: string }>;
  save(actor: string, input: unknown, id?: string): Promise<{ id: string }>;
  block(
    actor: string,
    id: string,
    blocked: boolean,
    reason: string,
  ): Promise<unknown>;
  recheck(actor: string, id: string): Promise<unknown>;
  metrics(): Promise<{
    catalogUpdatedAt: string | null;
    worker: { status: string; heartbeat: string } | null;
    verified: number;
    due: number;
    coverage: { country: string; count: number }[];
    outcomes: { reason: string; count: number }[];
  }>;
}
