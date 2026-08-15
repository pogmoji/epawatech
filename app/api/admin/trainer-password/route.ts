import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ResetPayload = {
  trainerId?: unknown;
  temporaryPassword?: unknown;
};

function responseError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !anonKey || !serviceRoleKey) {
    return responseError("Password administration is not configured for this deployment.", 503);
  }
  if (!token) return responseError("Authentication is required.", 401);

  let body: ResetPayload;
  try {
    body = await request.json();
  } catch {
    return responseError("Send valid password-reset details.", 400);
  }

  const trainerId = typeof body.trainerId === "string" ? body.trainerId : "";
  const temporaryPassword = typeof body.temporaryPassword === "string" ? body.temporaryPassword : "";
  if (!trainerId || temporaryPassword.length < 8) {
    return responseError("Choose a temporary password of at least 8 characters.", 400);
  }

  const requester = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData } = await requester.auth.getUser(token);
  if (!userData.user) return responseError("Your session is not valid.", 401);

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: requesterProfile } = await admin
    .from("profiles")
    .select("role, status")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (requesterProfile?.role !== "admin" || requesterProfile.status !== "active") {
    return responseError("Only an active admin can reset trainer passwords.", 403);
  }

  const { data: trainerProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", trainerId)
    .eq("role", "trainer")
    .maybeSingle();
  if (!trainerProfile) return responseError("Trainer account not found.", 404);

  const { error: updateError } = await admin.auth.admin.updateUserById(trainerId, {
    password: temporaryPassword,
  });
  if (updateError) return responseError("The trainer password could not be reset. Please try again.", 500);

  await admin.from("audit_logs").insert({
    actor_id: userData.user.id,
    action: "trainer_password_reset",
    entity_type: "profile",
    entity_id: trainerId,
    metadata: { reset_method: "admin_temporary_password" },
  });

  return Response.json({ success: true });
}
