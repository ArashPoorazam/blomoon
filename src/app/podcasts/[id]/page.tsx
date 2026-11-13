import { AuthenticatedGlobePage } from '@/components/AuthenticatedGlobePage';
export const dynamic='force-dynamic';
export default async function PodcastShowPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  return <AuthenticatedGlobePage returnPath={`/podcasts/${encodeURIComponent(id)}`} />;
}
