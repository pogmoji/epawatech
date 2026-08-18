import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function responseError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const classroomId = new URL(request.url).searchParams.get("classroomId") ?? "";

  if (!url || !anonKey || !serviceRoleKey) {
    return responseError("Classroom trainer lookup is not configured for this deployment.", 503);
  }
  if (!token) return responseError("Authentication is required.", 401);
  if (!classroomId) return responseError("Choose a classroom.", 400);

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
  if (!leadAssignment) return responseError("Only the active Lead Trainer can view classroom co-trainers.", 403);

  const { data, error } = await admin
    .from("trainer_assignments")
    .select("trainer_id, role, status, profiles:trainer_id ( full_name )")
    .eq("classroom_id", classroomId)
    .in("status", ["active", "pending"])
    .order("role", { ascending: false });
  if (error) return responseError("Classroom trainers could not be loaded.", 500);

  const trainers = (data ?? []).map((assignment) => {
    const profile = Array.isArray(assignment.profiles) ? assignment.profiles[0] : assignment.profiles;
    return {
      id: assignment.trainer_id,
      name: profile?.full_name?.trim() || "Unnamed trainer",
      role: assignment.role,
      status: assignment.status,
      isCurrentTrainer: assignment.trainer_id === userData.user.id,
    };
  });

  return Response.json({ trainers });
}
