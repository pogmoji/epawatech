import { supabase } from "@/lib/supabase";
import type { TrainerResult } from "./classrooms";

export type StudentMood = "happy" | "sad";

export type TrainerMoodCheckin = {
  id: string;
  studentId: string;
  studentName: string;
  mood: StudentMood;
  createdAt: string;
  checkinCount: number;
  happyCount: number;
  sadCount: number;
};

export type TrainerSadMoodCheckin = TrainerMoodCheckin;

type Relation<T> = T | T[] | null;

type MoodRow = {
  id: string;
  student_id: string;
  mood: StudentMood;
  created_at: string;
  profiles: Relation<{ full_name: string | null; username: string | null }>;
};

function one<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function dayRange(date: string) {
  const startDate = new Date(`${date}T00:00:00`);
  const endDate = new Date(`${date}T23:59:59.999`);
  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}

function studentName(row: MoodRow) {
  const profile = one(row.profiles);
  return profile?.full_name?.trim() || profile?.username || `Student ${row.student_id.slice(0, 8)}`;
}

export async function getTrainerMoodCheckins(classroomId: string, date: string, visibleMood: StudentMood = "sad"): Promise<TrainerResult<TrainerMoodCheckin[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { start, end } = dayRange(date);
  const { data, error } = await supabase
    .from("student_mood_checkins")
    .select("id, student_id, mood, created_at, profiles:student_id ( full_name, username )")
    .eq("classroom_id", classroomId)
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      data: null,
      error: error.message.includes("student_mood_checkins")
        ? "Mood check-ins are not ready yet. Run migration 032 in Supabase."
        : "Student wellbeing check-ins could not be loaded.",
    };
  }

  const grouped = new Map<string, TrainerMoodCheckin>();
  for (const row of (data ?? []) as unknown as MoodRow[]) {
    const current = grouped.get(row.student_id);
    grouped.set(row.student_id, {
      id: current?.id ?? row.id,
      studentId: row.student_id,
      studentName: current?.studentName ?? studentName(row),
      mood: current?.mood === "sad" || row.mood === "sad" ? "sad" : "happy",
      createdAt: current?.createdAt ?? row.created_at,
      checkinCount: (current?.checkinCount ?? 0) + 1,
      happyCount: (current?.happyCount ?? 0) + (row.mood === "happy" ? 1 : 0),
      sadCount: (current?.sadCount ?? 0) + (row.mood === "sad" ? 1 : 0),
    });
  }

  return { data: Array.from(grouped.values()).filter((item) => item.mood === visibleMood), error: null };
}

export async function getTrainerSadMoodCheckins(classroomId: string, date: string): Promise<TrainerResult<TrainerSadMoodCheckin[]>> {
  return getTrainerMoodCheckins(classroomId, date, "sad");
}
