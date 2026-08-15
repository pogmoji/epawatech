import { supabase } from "@/lib/supabase";
import type { StudentResult } from "./enrollment";

export type StudentFeedback = {
  id: string;
  studentId: string;
  classroomId: string | null;
  feedbackText: string;
  createdAt: string;
  updatedAt: string;
};

type StudentFeedbackRow = {
  id: string;
  student_id: string;
  classroom_id: string | null;
  feedback_text: string;
  created_at: string;
  updated_at: string;
};

function mapFeedback(row: StudentFeedbackRow): StudentFeedback {
  return {
    id: row.id,
    studentId: row.student_id,
    classroomId: row.classroom_id,
    feedbackText: row.feedback_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function unavailableTable(message: string) {
  return message.includes("student_feedback");
}

function cleanFeedbackText(value: string) {
  return value.trim().slice(0, 1200);
}

export async function getMyStudentFeedback(limit = 20): Promise<StudentResult<StudentFeedback[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase
    .from("student_feedback")
    .select("id, student_id, classroom_id, feedback_text, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return {
      data: null,
      error: unavailableTable(error.message)
        ? "Student feedback is not ready yet. Run migration 019 in Supabase, then refresh."
        : "Your feedback history could not be loaded.",
    };
  }

  return { data: ((data ?? []) as StudentFeedbackRow[]).map(mapFeedback), error: null };
}

export async function createMyStudentFeedback(input: { classroomId: string | null; feedbackText: string }): Promise<StudentResult<StudentFeedback>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };

  const feedbackText = cleanFeedbackText(input.feedbackText);
  if (feedbackText.length < 2) return { data: null, error: "Write a short reflection first." };

  const { data, error } = await supabase
    .from("student_feedback")
    .insert({
      student_id: userData.user.id,
      classroom_id: input.classroomId,
      feedback_text: feedbackText,
    })
    .select("id, student_id, classroom_id, feedback_text, created_at, updated_at")
    .single();

  if (error) {
    return {
      data: null,
      error: unavailableTable(error.message)
        ? "Student feedback is not ready yet. Run migration 019 in Supabase, then try again."
        : "Your reflection could not be saved.",
    };
  }

  return { data: mapFeedback(data as StudentFeedbackRow), error: null };
}

export async function updateMyStudentFeedback(input: { feedbackId: string; feedbackText: string }): Promise<StudentResult<StudentFeedback>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const feedbackText = cleanFeedbackText(input.feedbackText);
  if (feedbackText.length < 2) return { data: null, error: "Write a short reflection first." };

  const { data, error } = await supabase
    .from("student_feedback")
    .update({ feedback_text: feedbackText })
    .eq("id", input.feedbackId)
    .select("id, student_id, classroom_id, feedback_text, created_at, updated_at")
    .single();

  if (error) return { data: null, error: "Your reflection could not be updated." };
  return { data: mapFeedback(data as StudentFeedbackRow), error: null };
}
