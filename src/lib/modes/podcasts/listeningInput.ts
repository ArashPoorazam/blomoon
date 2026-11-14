import { z } from 'zod';
export const sessionInput = z.object({sessionId:z.uuid(),expectedVersion:z.number().int().min(0).max(2147483646)}).strict();
export const progressInput = z.object({sessionId:z.uuid(),sequence:z.number().int().min(1).max(2147483647),positionSeconds:z.number().finite().min(0).max(604800),completed:z.boolean()}).strict();
export const libraryInput = z.object({kind:z.enum(['follow','save']),id:z.uuid(),enabled:z.boolean()}).strict();
export type SessionInput = z.infer<typeof sessionInput>;
export type ProgressInput = z.infer<typeof progressInput>;
export type LibraryInput = z.infer<typeof libraryInput>;
