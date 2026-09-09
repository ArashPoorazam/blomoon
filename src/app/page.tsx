import { AuthenticatedGlobePage } from "@/components/AuthenticatedGlobePage";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <AuthenticatedGlobePage />;
}
