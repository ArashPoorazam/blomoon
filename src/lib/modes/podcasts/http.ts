import 'server-only';
import { requireUser, hasCompletedAuthentication } from '@/lib/auth/server';
import { z } from 'zod';
import { AdminError } from '@/lib/admin/access';
import { discoveryInput } from './discoveryInput';
export function podcastInput(request:Request) {
  const parsed=discoveryInput.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success) throw new AdminError(400,'Invalid podcast search or pagination.');
  return parsed.data;
}
export function podcastId(id:string) {
  if(!z.uuid().safeParse(id).success) throw new AdminError(404,'Show not found.');
  return id;
}

export async function requirePodcastUser() {
  const user=await requireUser();
  if(!await hasCompletedAuthentication(user))throw new AdminError(403,'Complete account verification to browse podcasts.');
  return user;
}
