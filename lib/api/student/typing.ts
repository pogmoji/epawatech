import { supabase } from "@/lib/supabase";
import type { ProgressSource } from "./progress";
import type { StudentResult } from "./enrollment";

export const MIN_LEADERBOARD_ACCURACY = 85;

export type TypingAttempt = {
  id: string;
  studentId: string;
  classroomId: string;
  wpm: number;
  accuracy: number;
  durationSeconds: number | null;
  attemptedAt: string;
  studentName?: string;
};

export type TypingSummary = {
  bestWpm: number | null;
  bestAccuracy: number | null;
  latestWpm: number | null;
  attempts: number;
};

type AttemptRow = {
  id: string;
  student_id: string;
  classroom_id: string;
  wpm: number;
  accuracy: number;
  duration_seconds: number | null;
  attempted_at: string;
  profiles?: { full_name: string | null; username: string | null } | { full_name: string | null; username: string | null }[] | null;
};

type LeaderboardRow = {
  id: string;
  student_id: string;
  classroom_id: string;
  wpm: number;
  accuracy: number;
  duration_seconds: number | null;
  attempted_at: string;
  student_name: string | null;
};

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function mapAttempt(row: AttemptRow): TypingAttempt {
  const profile = one(row.profiles);
  return {
    id: row.id,
    studentId: row.student_id,
    classroomId: row.classroom_id,
    wpm: row.wpm,
    accuracy: row.accuracy,
    durationSeconds: row.duration_seconds,
    attemptedAt: row.attempted_at,
    studentName: profile?.full_name?.trim() || profile?.username || undefined,
  };
}

export function summarizeTypingAttempts(attempts: TypingAttempt[]): TypingSummary {
  const latest = attempts[0] ?? null;
  return {
    bestWpm: attempts.length ? Math.max(...attempts.map((attempt) => attempt.wpm)) : null,
    bestAccuracy: attempts.length ? Math.max(...attempts.map((attempt) => attempt.accuracy)) : null,
    latestWpm: latest?.wpm ?? null,
    attempts: attempts.length,
  };
}

export async function saveTypingAttempt(input: {
  classroomId: string;
  source: ProgressSource;
  wpm: number;
  accuracy: number;
  durationSeconds?: number | null;
}): Promise<StudentResult<boolean>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };

  const { error } = await supabase.from("typing_attempts").insert({
    student_id: userData.user.id,
    classroom_id: input.classroomId,
    curriculum_activity_id: input.source.type === "master" ? input.source.activityId : null,
    classroom_curriculum_item_id: input.source.type === "classroom_item" ? input.source.itemId : null,
    wpm: input.wpm,
    accuracy: input.accuracy,
    duration_seconds: input.durationSeconds ?? null,
  });

  if (error) return { data: null, error: error.message || "Typing attempt could not be saved." };
  return { data: true, error: null };
}

export async function getMyTypingAttempts(classroomId: string): Promise<StudentResult<TypingAttempt[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase
    .from("typing_attempts")
    .select("id, student_id, classroom_id, wpm, accuracy, duration_seconds, attempted_at")
    .eq("classroom_id", classroomId)
    .order("attempted_at", { ascending: false });

  if (error) return { data: null, error: "Typing attempts could not be loaded." };
  return { data: ((data ?? []) as AttemptRow[]).map(mapAttempt), error: null };
}

export async function getClassroomTypingLeaderboard(classroomId: string): Promise<StudentResult<TypingAttempt[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase.rpc("get_classroom_typing_leaderboard", {
    p_classroom_id: classroomId,
    p_min_accuracy: MIN_LEADERBOARD_ACCURACY,
  });

  if (error) return { data: null, error: "Typing leaderboard could not be loaded." };

  return {
    data: ((data ?? []) as LeaderboardRow[])
      .map((row) => ({
        id: row.id,
        studentId: row.student_id,
        classroomId: row.classroom_id,
        wpm: row.wpm,
        accuracy: row.accuracy,
        durationSeconds: row.duration_seconds,
        attemptedAt: row.attempted_at,
        studentName: row.student_name ?? undefined,
      }))
      .sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy || Date.parse(b.attemptedAt) - Date.parse(a.attemptedAt)),
    error: null,
  };
}
