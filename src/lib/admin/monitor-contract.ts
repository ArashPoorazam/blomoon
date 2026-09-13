import { z } from "zod";
const metric = z.number().finite().nonnegative().nullable();
const percent = z.number().min(0).max(100).nullable();
export const monitorInput = z
  .object({
    host: z.literal("primary"),
    sampledAt: z.iso.datetime(),
    uptime: metric,
    cpu: percent,
    load: z.array(z.number().nonnegative()).length(3).nullable(),
    memoryUsed: metric,
    memoryTotal: metric,
    swapUsed: metric,
    swapTotal: metric,
    diskUsed: metric,
    diskTotal: metric,
    diskReadBytesPerSecond: metric,
    diskWriteBytesPerSecond: metric,
    networkRxBytesPerSecond: metric,
    networkTxBytesPerSecond: metric,
    release: z
      .string()
      .regex(/^[a-f0-9]{40}$/)
      .nullable(),
    backup: z
      .object({
        completedAt: z.iso.datetime(),
        bytes: z.number().nonnegative(),
      })
      .strict()
      .nullable(),
    services: z
      .array(
        z
          .object({
            name: z.enum(["app", "postgres", "traefik", "catalog", "health"]),
            state: z.enum([
              "running",
              "exited",
              "restarting",
              "paused",
              "created",
              "dead",
              "removing",
              "unknown",
            ]),
            health: z.enum(["healthy", "unhealthy", "starting", "none"]),
            restarts: z.number().int().nonnegative(),
            cpu: metric,
            memoryBytes: metric,
          })
          .strict(),
      )
      .max(5),
  })
  .strict();
export type MonitorSnapshot = z.infer<typeof monitorInput>;
export function isStale(receivedAt: string | Date, now = Date.now()) {
  return now - new Date(receivedAt).getTime() > 60000;
}
