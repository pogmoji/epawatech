import { supabase } from "@/lib/supabase";
import type { TrainerResult } from "./classrooms";

export type TrainerStudentFeedback = {
  id: string;
  studentId: string;
  classroomId: string | null;
  feedbackText: string;
  createdAt: string;
  updatedAt: string;
};

type FeedbackRow = {
  id: string;
  student_id: string;
  classroom_id: string | null;
  feedback_text: string;
  created_at: string;
  updated_at: string;
};

function mapFeedback(row: FeedbackRow): TrainerStudentFeedback {
  return {
    id: row.id,
    studentId: row.student_id,
    classroomId: row.classroom_id,
    feedbackText: row.feedback_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getStudentFeedbackForTrainer(classroomId: string, studentId: string): Promise<TrainerResult<TrainerStudentFeedback[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase
    .from("student_feedback")
    .select("id, student_id, classroom_id, feedback_text, created_at, updated_at")
    .eq("classroom_id", classroomId)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      data: null,
      error: error.message.includes("student_feedback")
        ? "Student feedback is not ready yet. Run migration 019 in Supabase."
        : "Student feedback could not be loaded.",
    };
  }

  return { data: ((data ?? []) as FeedbackRow[]).map(mapFeedback), error: null };
}
