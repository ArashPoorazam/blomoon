import { z } from 'zod';
export const discoveryInput = z.object({
  q: z.string().trim().max(120).default(''), language: z.string().trim().max(40).default(''),
  topic: z.string().trim().max(80).default(''), countryCode: z.string().regex(/^(?:[0-9]{3}|X-[A-Z]+)$/).optional(),
  offset: z.coerce.number().int().min(0).max(20000).default(0), limit: z.coerce.number().int().min(1).max(50).default(50),
  pageToken: z.string().max(64).optional(),
});
export type DiscoveryInput = z.infer<typeof discoveryInput>;
/** Fold Arabic/Persian yeh/kaf, accents, tatweel and joiners; retain other scripts. */
export function normalizeDiscoveryText(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[يى]/g,'ی').replace(/ك/g,'ک')
    .replace(/[\u0640\u064b-\u065f\u0670\u200c\u200d]/g,'').trim();
}
