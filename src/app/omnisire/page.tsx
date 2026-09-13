import { authorizeAdminPage } from "@/lib/admin/page-access";
import { Overview } from "@/components/omnisire/Overview";
export default async function Page() {
  await authorizeAdminPage();
  return <Overview />;
}
