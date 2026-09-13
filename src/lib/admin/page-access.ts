import "server-only";
import { notFound, redirect } from "next/navigation";
import { AdminError } from "./access";
import { requireAdmin } from "./http";
/** Page policy: send signed-out visitors to login and conceal owner-only pages from other accounts. */
export async function authorizeAdminPage() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof AdminError && error.status === 401)
      redirect("/login?next=/omnisire");
    if (error instanceof AdminError && error.status === 403) notFound();
    throw error;
  }
}
