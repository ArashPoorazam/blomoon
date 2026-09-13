import { connection } from "next/server";
import { authorizeAdminPage } from "@/lib/admin/page-access";
import { OmnisireShell } from "@/components/omnisire/OmnisireShell";
import "./omnisire.css";
export const metadata = {
  title: "Omnisire",
  robots: { index: false, follow: false },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const user = await authorizeAdminPage();
  return <OmnisireShell email={user.email}>{children}</OmnisireShell>;
}
