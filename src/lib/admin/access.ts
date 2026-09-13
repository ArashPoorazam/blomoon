export function isOwnerId(
  id: string,
  configured = process.env.BLOMOON_ADMIN_USER_IDS ?? "",
) {
  return configured
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(id);
}
export function isAdmin(
  user: { id: string; emailVerified: boolean } | null,
  configured = process.env.BLOMOON_ADMIN_USER_IDS ?? "",
) {
  return Boolean(user?.emailVerified && isOwnerId(user.id, configured));
}
export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assertAdminOrigin(request: Request) {
  const expected = process.env.BETTER_AUTH_URL;
  if (!expected || request.headers.get("origin") !== new URL(expected).origin)
    throw new AdminError(403, "Invalid request origin.");
}
