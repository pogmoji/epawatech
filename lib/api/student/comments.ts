import { supabase } from "@/lib/supabase";
import type { StudentResult } from "./enrollment";

export type StudentWeeklyComment = {
  id: string;
  weekNumber: number;
  comment: string;
  trainerName: string;
  createdAt: string;
};

type Relation<T> = T | T[] | null;

type WeeklyCommentRow = {
  id: string;
  week_number: number;
  comment: string;
  created_at: string;
  profiles: Relation<{ full_name: string | null }>;
};

function one<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getMyWeeklyComments(classroomId: string, limit = 5): Promise<StudentResult<StudentWeeklyComment[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase
    .from("weekly_student_comments")
    .select(`
      id,
      week_number,
      comment,
      created_at,
      profiles:trainer_id ( full_name )
    `)
    .eq("classroom_id", classroomId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching weekly comments:", error);
    return { data: null, error: "Failed to fetch weekly trainer comments." };
  }

  const comments = ((data ?? []) as unknown as WeeklyCommentRow[]).map((row) => ({
    id: row.id,
    weekNumber: row.week_number,
    comment: row.comment,
    trainerName: one(row.profiles)?.full_name || "Trainer",
    createdAt: row.created_at,
  }));

  return { data: comments, error: null };
}
