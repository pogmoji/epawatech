import { createClient } from "@supabase/supabase-js";
import { isValidStudentUsername, normalizeStudentUsername, studentUsernameAuthEmail } from "@/lib/auth";

export const runtime = "nodejs";

type UpdatePayload = {
  classroomId?: unknown;
  studentId?: unknown;
  username?: unknown;
  password?: unknown;
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
    return responseError("Student account tools are not configured for this deployment.", 503);
  }
  if (!token) return responseError("Authentication is required.", 401);

  let body: UpdatePayload;
  try {
    body = await request.json();
  } catch {
    return responseError("Send valid student account details.", 400);
  }

  const classroomId = typeof body.classroomId === "string" ? body.classroomId : "";
  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const usernameInput = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const username = usernameInput.trim() ? normalizeStudentUsername(usernameInput) : "";
  if (!classroomId || !studentId) return responseError("Choose a classroom and student.", 400);
  if (!username && !password) return responseError("Enter a new username or password.", 400);
  if (username && !isValidStudentUsername(username)) return responseError("Enter a valid student username.", 400);
  if (password && password.length < 6) return responseError("Use a password of at least 6 characters.", 400);

  const requester = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData } = await requester.auth.getUser(token);
  if (!userData.user) return responseError("Your session is not valid.", 401);

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: leadAssignment } = await admin
    .from("trainer_assignments")
    .select("id")
    .eq("trainer_id", userData.user.id)
    .eq("classroom_id", classroomId)
    .eq("role", "lead")
    .eq("status", "active")
    .maybeSingle();
  if (!leadAssignment) return responseError("Only the active Lead Trainer can update student accounts for this classroom.", 403);

  const { data: enrollment } = await admin
    .from("student_enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("classroom_id", classroomId)
    .eq("status", "active")
    .maybeSingle();
  if (!enrollment) return responseError("That student is not active in this classroom.", 404);

  const { data: studentProfile } = await admin
    .from("profiles")
    .select("id, username, role")
    .eq("id", studentId)
    .eq("role", "student")
    .maybeSingle();
  if (!studentProfile) return responseError("Student account not found.", 404);

  if (username && username !== studentProfile.username) {
    const { data: existingProfile, error: lookupError } = await admin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .neq("id", studentId)
      .maybeSingle();
    if (lookupError) return responseError("Username availability could not be checked.", 503);
    if (existingProfile) return responseError("That username is already in use.", 409);
  }

  const updateAttributes: { email?: string; password?: string; email_confirm?: boolean } = {};
  if (username) {
    updateAttributes.email = studentUsernameAuthEmail(username);
    updateAttributes.email_confirm = true;
  }
  if (password) updateAttributes.password = password;

  const { error: authError } = await admin.auth.admin.updateUserById(studentId, updateAttributes);
  if (authError) {
    const message = authError.message.toLowerCase();
    if (message.includes("already") || message.includes("unique")) {
      return responseError("That username is already in use.", 409);
    }
    return responseError("The student account could not be updated. Please try again.", 500);
  }

  if (username) {
    const { error: profileError } = await admin
      .from("profiles")
      .update({ username })
      .eq("id", studentId)
      .eq("role", "student");
    if (profileError) return responseError("The student username could not be saved. Please contact an admin.", 500);
  }

  await admin.from("audit_logs").insert({
    actor_id: userData.user.id,
    action: "lead_trainer_student_account_updated",
    entity_type: "profile",
    entity_id: studentId,
    before_data: { username: studentProfile.username ?? null },
    after_data: { username: username || (studentProfile.username ?? null) },
    metadata: {
      classroom_id: classroomId,
      changed_username: Boolean(username),
      changed_password: Boolean(password),
    },
  });

  return Response.json({ success: true, username: username || studentProfile.username });
}
