export type IngestionFailure = "unsafe_address" | "unapproved_origin" | "redirect_limit" | "http_error" | "timeout" | "cancelled" | "network" | "too_large" | "encoding" | "invalid_xml" | "xml_limit" | "lease_lost" | "worker_failed" | "source_changed";
export class IngestionError extends Error {
  constructor(public readonly code: IngestionFailure) { super(code); }
}
export function failureCode(error: unknown): IngestionFailure {
  return error instanceof IngestionError ? error.code : "worker_failed";
}
