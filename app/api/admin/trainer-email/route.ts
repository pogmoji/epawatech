import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type EmailPayload = {
  trainerId?: unknown;
  email?: unknown;
};

function responseError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && anonKey && serviceRoleKey ? { url, anonKey, serviceRoleKey } : null;
}

async function getAuthorizedClients(request: Request) {
  const env = config();
  if (!env) return { error: responseError("Trainer email administration is not configured for this deployment.", 503) };

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: responseError("Authentication is required.", 401) };

  const requester = createClient(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData } = await requester.auth.getUser(token);
  if (!userData.user) return { error: responseError("Your session is not valid.", 401) };

  const admin = createClient(env.url, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: requesterProfile } = await admin
    .from("profiles")
    .select("role, status")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (requesterProfile?.role !== "admin" || requesterProfile.status !== "active") {
    return { error: responseError("Only an active admin can edit trainer emails.", 403) };
  }

  return { admin, requesterId: userData.user.id };
}

export async function GET(request: Request) {
  const authorized = await getAuthorizedClients(request);
  if ("error" in authorized) return authorized.error;

  const { data: trainerProfiles, error: profilesError } = await authorized.admin
    .from("profiles")
    .select("id")
    .eq("role", "trainer");
  if (profilesError) return responseError("Trainer accounts could not be loaded.", 500);

  const emails: Record<string, string> = {};
  await Promise.all((trainerProfiles ?? []).map(async ({ id }: { id: string }) => {
    const { data } = await authorized.admin.auth.admin.getUserById(id);
    if (data.user?.email) emails[id] = data.user.email;
  }));

  return Response.json({ emails });
}

export async function POST(request: Request) {
  const authorized = await getAuthorizedClients(request);
  if ("error" in authorized) return authorized.error;

  let body: EmailPayload;
  try {
    body = await request.json();
  } catch {
    return responseError("Send valid trainer email details.", 400);
  }

  const trainerId = typeof body.trainerId === "string" ? body.trainerId : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!trainerId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return responseError("Enter a valid trainer email address.", 400);
  }

  const { data: trainerProfile } = await authorized.admin
    .from("profiles")
    .select("id")
    .eq("id", trainerId)
    .eq("role", "trainer")
    .maybeSingle();
  if (!trainerProfile) return responseError("Trainer account not found.", 404);

  const { data: beforeUser } = await authorized.admin.auth.admin.getUserById(trainerId);
  const { error: updateError } = await authorized.admin.auth.admin.updateUserById(trainerId, {
    email,
    email_confirm: true,
  });
  if (updateError) {
    const duplicate = updateError.message.toLowerCase().includes("already") || updateError.message.toLowerCase().includes("registered");
    return responseError(duplicate ? "Another account already uses that email." : "The trainer email could not be updated. Please try again.", 500);
  }

  await authorized.admin.from("audit_logs").insert({
    actor_id: authorized.requesterId,
    action: "trainer_email_updated",
    entity_type: "profile",
    entity_id: trainerId,
    before_data: { email: beforeUser.user?.email ?? null },
    after_data: { email },
    metadata: { update_method: "admin_auth_email_update" },
  });

  return Response.json({ email });
}
