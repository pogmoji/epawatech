import { supabase } from "@/lib/supabase";
import type { TrainerResult } from "./classrooms";

export type WeeklyComment = {
  id: string;
  studentId: string;
  classroomId: string;
  trainerId: string;
  weekNumber: number;
  comment: string;
  createdAt: string;
};

export async function createWeeklyComment(input: {
  classroomId: string;
  studentId: string;
  weekNumber: number;
  comment: string;
}): Promise<TrainerResult<boolean>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };

  const { error } = await supabase.from("weekly_student_comments").insert({
    student_id: input.studentId,
    classroom_id: input.classroomId,
    trainer_id: userData.user.id,
    week_number: input.weekNumber,
    comment: input.comment.trim(),
  });

  if (error) {
    const duplicate = error.code === "23505";
    return {
      data: null,
      error: duplicate
        ? "A comment already exists for this reporting period. Use Edit to update it."
        : "Weekly comment could not be saved.",
    };
  }

  return { data: true, error: null };
}

export async function updateWeeklyComment(input: {
  commentId: string;
  classroomId: string;
  comment: string;
}): Promise<TrainerResult<boolean>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { error } = await supabase
    .from("weekly_student_comments")
    .update({ comment: input.comment.trim() })
    .eq("id", input.commentId)
    .eq("classroom_id", input.classroomId);

  if (error) return { data: null, error: "Weekly comment could not be updated." };
  return { data: true, error: null };
}

export async function getStudentWeeklyComments(classroomId: string, studentId: string): Promise<TrainerResult<WeeklyComment[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase
    .from("weekly_student_comments")
    .select("id, student_id, classroom_id, trainer_id, week_number, comment, created_at")
    .eq("classroom_id", classroomId)
    .eq("student_id", studentId)
    .order("week_number", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: "Comment history could not be loaded." };

  return {
    data: (data ?? []).map((row) => ({
      id: row.id,
      studentId: row.student_id,
      classroomId: row.classroom_id,
      trainerId: row.trainer_id,
      weekNumber: row.week_number,
      comment: row.comment,
      createdAt: row.created_at,
    })),
    error: null,
  };
}
