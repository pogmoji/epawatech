import { supabase } from "@/lib/supabase";
import { StudentResult } from "./enrollment";

type ProgressData = Record<string, unknown>;

export type ActivityProgress = {
  curriculum_activity_id: string | null;
  classroom_curriculum_item_id: string | null;
  status: "not_started" | "in_progress" | "completed";
  progress_data: ProgressData;
};

export type ProgressSource =
  | { type: "master"; activityId: string }
  | { type: "classroom_item"; itemId: string };

export async function getStudentProgress(classroomId: string): Promise<StudentResult<ActivityProgress[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: progressData, error: progressError } = await supabase
    .from("lesson_progress")
    .select("curriculum_activity_id, classroom_curriculum_item_id, status, progress_data")
    .eq("classroom_id", classroomId);

  if (progressError) {
    console.error("Error fetching student progress:", progressError);
    return { data: null, error: "Failed to fetch progress." };
  }

  return { data: (progressData || []) as ActivityProgress[], error: null };
}

export async function saveActivityProgress(classroomId: string, source: ProgressSource, status: "not_started" | "in_progress" | "completed", data?: ProgressData): Promise<StudentResult<boolean>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  // Get current user (student)
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { data: null, error: "Not authenticated" };
  }

  const payload = {
      student_id: userData.user.id,
      classroom_id: classroomId,
      curriculum_activity_id: source.type === "master" ? source.activityId : null,
      classroom_curriculum_item_id: source.type === "classroom_item" ? source.itemId : null,
      status,
      progress_data: data,
      started_at: status === "in_progress" ? new Date().toISOString() : undefined,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

  const conflictTarget =
    source.type === "master"
      ? "student_id,classroom_id,curriculum_activity_id"
      : "student_id,classroom_id,classroom_curriculum_item_id";

  const { error: upsertError } = await supabase
    .from("lesson_progress")
    .upsert(payload, { onConflict: conflictTarget });

  if (upsertError) {
    console.error("Error saving progress:", upsertError);
    return { data: null, error: "Failed to save progress." };
  }

  return { data: true, error: null };
}
