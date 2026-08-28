import { z } from "zod";
import { startPendingRegistration } from "@/lib/auth/pending-registration";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";

const pendingRegistrationSchema = z.object({
  confirmPassword: z.string().min(8).max(128),
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128)
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords must match.",
  path: ["confirmPassword"]
});

export const POST = withApiLogging("api.auth.pending_registration.start", async (request: Request) => {
  const parsed = pendingRegistrationSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email and matching passwords." }, { status: 400 });
  }

  const result = await startPendingRegistration({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (result.kind === "duplicate-email") {
    return Response.json({ error: "An account already exists for that email." }, { status: 409 });
  }

  return Response.json({
    email: result.email,
    expiresAt: result.expiresAt.toISOString(),
    success: true
  }, {
    headers: { "Cache-Control": "no-store" }
  });
});
