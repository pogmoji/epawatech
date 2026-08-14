import { supabase } from "@/lib/supabase";
import type { StudentResult } from "./enrollment";

export type StudentChallenge = {
  id: string;
  title: string;
  moduleTitle: string;
  moduleSlug: string;
  lessonSlug: string;
  activityType: string;
  dueDate: string | null;
  assignedAt: string;
};

type Relation<T> = T | T[] | null;

type ChallengeAssignmentRow = {
  id: string;
  due_date: string | null;
  created_at: string;
  curriculum_lessons: Relation<{
    slug: string;
    title: string;
    curriculum_modules: Relation<{
      slug: string;
      title: string;
    }>;
    lesson_activities: Relation<{
      activity_type: string;
    }>;
  }>;
};

function one<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getStudentChallenges(classroomId: string): Promise<StudentResult<StudentChallenge[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase
    .from("challenge_assignments")
    .select(`
      id,
      due_date,
      created_at,
      curriculum_lessons:challenge_id (
        slug,
        title,
        curriculum_modules:module_id ( slug, title ),
        lesson_activities ( activity_type )
      )
    `)
    .eq("classroom_id", classroomId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assigned challenges:", error);
    return { data: null, error: "Failed to fetch assigned challenges." };
  }

  const challenges = ((data ?? []) as unknown as ChallengeAssignmentRow[]).flatMap((row) => {
    const lesson = one(row.curriculum_lessons);
    const curriculumModule = one(lesson?.curriculum_modules ?? null);
    const activity = one(lesson?.lesson_activities ?? null);
    if (!lesson?.slug || !curriculumModule?.slug) return [];

    return [{
      id: row.id,
      title: lesson.title,
      moduleTitle: curriculumModule.title,
      moduleSlug: curriculumModule.slug,
      lessonSlug: lesson.slug,
      activityType: activity?.activity_type || "challenge",
      dueDate: row.due_date,
      assignedAt: row.created_at,
    }];
  });

  return { data: challenges, error: null };
}
