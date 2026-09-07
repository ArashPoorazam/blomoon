import { AuthenticatedGlobePage } from "@/components/AuthenticatedGlobePage";
import { folderSharePath } from "@/lib/sharing/links";

export const dynamic = "force-dynamic";
export default async function SharedFolderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AuthenticatedGlobePage returnPath={folderSharePath(token)} />;
}
