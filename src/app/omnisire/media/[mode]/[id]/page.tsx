import { notFound } from "next/navigation";
import { z } from "zod";
import { authorizeAdminPage } from "@/lib/admin/page-access";
import { requireAdminMode } from "@/lib/admin/registry";
import { MediaEditor } from "@/components/omnisire/MediaEditor";
export default async function Page({
  params,
}: {
  params: Promise<{ mode: string; id: string }>;
}) {
  await authorizeAdminPage();
  const { mode, id } = await params;
  if (id !== "new" && !z.uuid().safeParse(id).success) notFound();
  const adapter = requireAdminMode(mode);
  return <MediaEditor mode={adapter.descriptor.id} id={id} />;
}
