import { z } from "zod";
import { verifyPendingRegistration } from "@/lib/auth/pending-registration";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";

const pendingRegistrationVerificationSchema = z.object({
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
  otp: z.string().trim().regex(/^\d{6}$/)
});

export const POST = withApiLogging("api.auth.pending_registration.verify", async (request: Request) => {
  const parsed = pendingRegistrationVerificationSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: "Enter the 6-digit verification code." }, { status: 400 });
  }

  const result = await verifyPendingRegistration(parsed.data.email, parsed.data.otp);

  if (result.kind === "verified") {
    return Response.json({ email: result.email, success: true }, {
      headers: { "Cache-Control": "no-store" }
    });
  }

  if (result.kind === "duplicate-email") {
    return Response.json({ error: "An account already exists for that email." }, { status: 409 });
  }

  if (result.kind === "expired") {
    return Response.json({ error: "That code expired. Request a new verification code." }, { status: 409 });
  }

  if (result.kind === "invalid-code") {
    return Response.json({
      attemptsRemaining: result.attemptsRemaining,
      error: result.attemptsRemaining > 0 ? "That verification code is not valid." : "Too many invalid attempts. Request a new verification code."
    }, { status: 400 });
  }

  return Response.json({ error: "Request a new verification code." }, { status: 404 });
});
