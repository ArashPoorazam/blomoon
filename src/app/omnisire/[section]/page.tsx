import { Suspense } from "react";
import { notFound } from "next/navigation";
import { authorizeAdminPage } from "@/lib/admin/page-access";
import { Media } from "@/components/omnisire/Media";
import { Modes } from "@/components/omnisire/Modes";
import { Users } from "@/components/omnisire/Users";
import { Servers } from "@/components/omnisire/Servers";
import { Jobs } from "@/components/omnisire/Jobs";
import { Activity } from "@/components/omnisire/Activity";
import { Settings } from "@/components/omnisire/Settings";
const pages: Record<string, React.ComponentType> = {
  media: Media,
  modes: Modes,
  users: Users,
  servers: Servers,
  jobs: Jobs,
  activity: Activity,
  settings: Settings,
};
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  await authorizeAdminPage();
  const { section } = await params;
  const Component = pages[section];
  if (!Component) notFound();
  return (
    <Suspense fallback={<p>Loading workspace…</p>}>
      <Component />
    </Suspense>
  );
}
