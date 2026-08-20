import { supabase } from "@/lib/supabase";
import type { StudentResult } from "./enrollment";

export type StudentMood = "happy" | "sad";

export type StudentMoodCheckin = {
  id: string;
  studentId: string;
  classroomId: string | null;
  mood: StudentMood;
  createdAt: string;
};

type MoodRow = {
  id: string;
  student_id: string;
  classroom_id: string | null;
  mood: StudentMood;
  created_at: string;
};

function mapMood(row: MoodRow): StudentMoodCheckin {
  return {
    id: row.id,
    studentId: row.student_id,
    classroomId: row.classroom_id,
    mood: row.mood,
    createdAt: row.created_at,
  };
}

function moodTableUnavailable(message: string) {
  return message.includes("student_mood_checkins");
}

export async function createMyStudentMoodCheckin(input: { classroomId: string | null; mood: StudentMood }): Promise<StudentResult<StudentMoodCheckin>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };

  const { data, error } = await supabase
    .from("student_mood_checkins")
    .insert({
      student_id: userData.user.id,
      classroom_id: input.classroomId,
      mood: input.mood,
    })
    .select("id, student_id, classroom_id, mood, created_at")
    .single();

  if (error) {
    return {
      data: null,
      error: moodTableUnavailable(error.message)
        ? "Mood check-ins are not ready yet. Run migration 032 in Supabase, then refresh."
        : "Your feeling check-in could not be saved.",
    };
  }

  return { data: mapMood(data as MoodRow), error: null };
}
