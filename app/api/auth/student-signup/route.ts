import { createClient } from "@supabase/supabase-js";
import { isValidStudentUsername, normalizeStudentUsername, studentUsernameAuthEmail } from "@/lib/auth";

export const runtime = "nodejs";

type SignupPayload = {
  name?: unknown;
  username?: unknown;
  password?: unknown;
};

function responseError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return responseError("Student signup is not configured for this deployment.", 503);
  }

  let body: SignupPayload;
  try {
    body = await request.json();
  } catch {
    return responseError("Send valid signup details.", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const username = typeof body.username === "string" ? normalizeStudentUsername(body.username) : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!name || name.length > 120 || !isValidStudentUsername(username) || password.length < 6) {
    return responseError("Enter a valid name, username, and password of at least 6 characters.", 400);
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existingProfile, error: lookupError } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  if (lookupError) return responseError("Student signup is temporarily unavailable.", 503);
  if (existingProfile) return responseError("That username is already in use.", 409);

  const { error: createError } = await admin.auth.admin.createUser({
    email: studentUsernameAuthEmail(username),
    password,
    email_confirm: true,
    user_metadata: { full_name: name, requested_role: "student", username },
  });

  if (createError) {
    const message = createError.message.toLowerCase();
    if (message.includes("already") || message.includes("unique")) {
      return responseError("That username is already in use.", 409);
    }
    return responseError("We could not create the student account. Please try again.", 500);
  }

  return Response.json({ success: true }, { status: 201 });
}
