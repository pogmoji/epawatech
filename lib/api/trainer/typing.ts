import { supabase } from "@/lib/supabase";
import type { TrainerResult } from "./classrooms";
import { MIN_LEADERBOARD_ACCURACY, summarizeTypingAttempts, type TypingAttempt, type TypingSummary } from "@/lib/api/student/typing";

type AttemptRow = {
  id: string;
  student_id: string;
  classroom_id: string;
  wpm: number;
  accuracy: number;
  duration_seconds: number | null;
  attempted_at: string;
};

function mapAttempt(row: AttemptRow): TypingAttempt {
  return {
    id: row.id,
    studentId: row.student_id,
    classroomId: row.classroom_id,
    wpm: row.wpm,
    accuracy: row.accuracy,
    durationSeconds: row.duration_seconds,
    attemptedAt: row.attempted_at,
  };
}

export type TrainerTypingSummary = {
  byStudent: Record<string, TypingSummary>;
  classAverageWpm: number | null;
  classBestWpm: number | null;
  classAverageAccuracy: number | null;
};

export async function getTrainerClassroomTypingSummary(classroomId: string): Promise<TrainerResult<TrainerTypingSummary>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase
    .from("typing_attempts")
    .select("id, student_id, classroom_id, wpm, accuracy, duration_seconds, attempted_at")
    .eq("classroom_id", classroomId)
    .order("attempted_at", { ascending: false });

  if (error) return { data: null, error: "Typing summaries could not be loaded." };

  const attempts = ((data ?? []) as AttemptRow[]).map(mapAttempt);
  const grouped = attempts.reduce<Record<string, TypingAttempt[]>>((current, attempt) => {
    current[attempt.studentId] = current[attempt.studentId] ?? [];
    current[attempt.studentId].push(attempt);
    return current;
  }, {});
  const byStudent = Object.fromEntries(Object.entries(grouped).map(([studentId, rows]) => [studentId, summarizeTypingAttempts(rows)]));
  const eligible = attempts.filter((attempt) => attempt.accuracy >= MIN_LEADERBOARD_ACCURACY);

  return {
    data: {
      byStudent,
      classAverageWpm: eligible.length ? Math.round(eligible.reduce((total, item) => total + item.wpm, 0) / eligible.length) : null,
      classBestWpm: eligible.length ? Math.max(...eligible.map((item) => item.wpm)) : null,
      classAverageAccuracy: eligible.length ? Math.round(eligible.reduce((total, item) => total + item.accuracy, 0) / eligible.length) : null,
    },
    error: null,
  };
}

export async function getStudentTypingHistory(classroomId: string, studentId: string): Promise<TrainerResult<TypingAttempt[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase
    .from("typing_attempts")
    .select("id, student_id, classroom_id, wpm, accuracy, duration_seconds, attempted_at")
    .eq("classroom_id", classroomId)
    .eq("student_id", studentId)
    .order("attempted_at", { ascending: false });

  if (error) return { data: null, error: "Typing history could not be loaded." };
  return { data: ((data ?? []) as AttemptRow[]).map(mapAttempt), error: null };
}
