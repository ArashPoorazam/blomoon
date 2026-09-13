import { z } from "zod";
import { adminRequest, readAdminBody } from "@/lib/admin/http";
import { AdminError } from "@/lib/admin/access";
import {
  catalogQueryInput,
  modeSettingsInput,
  settingsInput,
} from "@/lib/admin/contracts";
import { getSettings, saveSettings } from "@/lib/admin/settings";
import { requireAdminMode } from "@/lib/admin/registry";
import { activity, modesOverview, overview, issues } from "@/lib/admin/queries";
import { getMonitoring } from "@/lib/admin/monitor";
import { changeUser, listUsers } from "@/lib/admin/users";
import { enqueueJob, listJobs, retryJob } from "@/lib/admin/jobs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ resource: string[] }> };
async function handle(request: Request, context: Context) {
  return adminRequest(request, async (actor) => {
    const { resource: parts } = await context.params;
    const path = parts.join("/");
    const query = new URL(request.url).searchParams;
    if (request.method === "GET") {
      if (path === "issues") return issues();
      if (path === "overview") return overview();
      if (path === "settings")
        return {
          settings: await getSettings(),
          integrations: {
            email: Boolean(
              process.env.RESEND_API_KEY && process.env.BLOMOON_AUTH_EMAIL_FROM,
            ),
            google: Boolean(
              process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
            ),
            collector: (process.env.BLOMOON_COLLECTOR_TOKEN?.length ?? 0) >= 32,
            database: Boolean(process.env.DATABASE_URL),
          },
        };
      if (path === "modes") return modesOverview();
      if (path === "servers")
        return getMonitoring(
          z.coerce
            .number()
            .pipe(z.union([z.literal(1), z.literal(24), z.literal(168)]))
            .parse(query.get("hours") ?? 24),
        );
      if (path === "users") {
        const p = catalogQueryInput.parse(Object.fromEntries(query));
        return listUsers(p.q, p.page);
      }
      if (path === "jobs") return listJobs();
      if (path === "activity") return activity(query);
      if (parts[0] === "modes" && parts[2] === "items" && parts.length <= 4) {
        const mode = requireAdminMode(parts[1]);
        return parts[3]
          ? mode.detail(z.uuid().parse(parts[3]))
          : mode.list(catalogQueryInput.parse(Object.fromEntries(query)));
      }
    } else {
      if (path === "settings" && request.method === "PATCH")
        return saveSettings(
          actor,
          "application",
          settingsInput.parse(await readAdminBody(request)),
        );
      if (
        parts[0] === "users" &&
        parts.length === 2 &&
        request.method === "POST"
      )
        return changeUser(actor, parts[1], await readAdminBody(request));
      if (
        parts[0] === "jobs" &&
        parts[2] === "retry" &&
        parts.length === 3 &&
        request.method === "POST"
      )
        return retryJob(actor, z.uuid().parse(parts[1]));
      if (parts[0] === "modes") {
        const mode = requireAdminMode(parts[1]);
        if (parts.length === 2 && request.method === "PATCH")
          return saveSettings(
            actor,
            `mode:${parts[1]}`,
            modeSettingsInput.parse(await readAdminBody(request)),
          );
        if (
          parts[2] === "sync" &&
          parts.length === 3 &&
          request.method === "POST" &&
          mode.descriptor.capabilities.sync
        )
          return enqueueJob(parts[1], "sync", actor);
        if (parts[2] === "items") {
          if (parts.length === 3 && request.method === "POST")
            return mode.save(actor, await readAdminBody(request));
          if (parts.length === 4 && request.method === "PATCH")
            return mode.save(
              actor,
              await readAdminBody(request),
              z.uuid().parse(parts[3]),
            );
          if (
            parts[3] === "bulk" &&
            parts.length === 4 &&
            request.method === "POST"
          ) {
            const value = z
              .object({
                ids: z.array(z.uuid()).min(1).max(25),
                action: z.enum(["block", "unblock", "recheck"]),
                reason: z.string().trim().min(1).max(500),
              })
              .strict()
              .parse(await readAdminBody(request));
            const results = [];
            for (const id of [...new Set(value.ids)]) {
              try {
                await (value.action === "recheck"
                  ? mode.recheck(actor, id)
                  : mode.block(
                      actor,
                      id,
                      value.action === "block",
                      value.reason,
                    ));
                results.push({ id, ok: true });
              } catch (e) {
                results.push({
                  id,
                  ok: false,
                  error:
                    e instanceof AdminError ? e.message : "Operation failed.",
                });
              }
            }
            return { results };
          }
          if (parts.length === 5 && request.method === "POST") {
            const id = z.uuid().parse(parts[3]);
            if (parts[4] === "recheck") return mode.recheck(actor, id);
            if (parts[4] === "block") {
              const v = z
                .object({
                  blocked: z.boolean(),
                  reason: z.string().trim().min(1).max(500),
                })
                .strict()
                .parse(await readAdminBody(request));
              return mode.block(actor, id, v.blocked, v.reason);
            }
          }
        }
      }
    }
    throw new AdminError(404, "Resource not found.");
  });
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
