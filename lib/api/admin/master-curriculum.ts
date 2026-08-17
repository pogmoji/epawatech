import { supabase } from "@/lib/supabase";
import type { LessonActivity } from "@/lib/curriculum";
import { type MasterCurriculumModule, getMasterCurriculumModules } from "@/lib/api/curriculum/master";
import type { AdminResult } from "./dashboard";

export type MasterLessonInput = {
  moduleId: string;
  lessonId?: string;
  activityId?: string;
  slug: string;
  title: string;
  topics: string[];
  sortOrder: number;
  isChallenge: boolean;
  timeLimitSeconds: number | null;
  activity: LessonActivity;
};

function unavailable<T>(): AdminResult<T> {
  return { data: null, error: "Supabase is not configured for this deployment." };
}

function cleanSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function cleanTopics(topics: string[]) {
  return topics.map((topic) => topic.trim()).filter(Boolean);
}

export async function getAdminMasterCurriculum(): Promise<AdminResult<MasterCurriculumModule[]>> {
  const result = await getMasterCurriculumModules();
  if (result.error || !result.data) return { data: null, error: result.error || "Master curriculum could not be loaded." };
  return { data: result.data, error: null };
}

export async function updateMasterLesson(input: MasterLessonInput): Promise<AdminResult<boolean>> {
  if (!supabase) return unavailable();
  if (!input.lessonId || !input.activityId) return { data: null, error: "Choose an existing lesson to update." };
  if (!input.title.trim()) return { data: null, error: "Enter a lesson title." };
  const slug = cleanSlug(input.slug);
  if (!slug) return { data: null, error: "Enter a lesson slug." };

  const lessonUpdate = await supabase
    .from("curriculum_lessons")
    .update({
      slug,
      title: input.title.trim(),
      topics: cleanTopics(input.topics),
      sort_order: input.sortOrder,
      is_challenge: input.isChallenge,
      time_limit_seconds: input.timeLimitSeconds,
    })
    .eq("id", input.lessonId);
  if (lessonUpdate.error) return { data: null, error: lessonUpdate.error.message || "Master lesson could not be updated." };

  const currentActivity = await supabase
    .from("lesson_activities")
    .select("version")
    .eq("id", input.activityId)
    .single();
  if (currentActivity.error) return { data: null, error: currentActivity.error.message || "Current master activity version could not be read." };
  const nextVersion = ((currentActivity.data as { version?: number } | null)?.version ?? 1) + 1;

  const activityUpdate = await supabase
    .from("lesson_activities")
    .update({
      activity_type: input.activity.type,
      configuration: withoutType(input.activity),
      version: nextVersion,
    })
    .eq("id", input.activityId);
  if (activityUpdate.error) return { data: null, error: activityUpdate.error.message || "Master activity could not be updated." };

  return { data: true, error: null };
}

export async function createMasterLesson(input: MasterLessonInput): Promise<AdminResult<boolean>> {
  if (!supabase) return unavailable();
  if (!input.moduleId) return { data: null, error: "Choose a module." };
  if (!input.title.trim()) return { data: null, error: "Enter a lesson title." };
  const slug = cleanSlug(input.slug);
  if (!slug) return { data: null, error: "Enter a lesson slug." };

  const lesson = await supabase
    .from("curriculum_lessons")
    .insert({
      module_id: input.moduleId,
      slug,
      title: input.title.trim(),
      topics: cleanTopics(input.topics),
      sort_order: input.sortOrder,
      is_challenge: input.isChallenge,
      time_limit_seconds: input.timeLimitSeconds,
    })
    .select("id")
    .single();
  if (lesson.error || !lesson.data) return { data: null, error: lesson.error?.message || "Master lesson could not be created." };

  const activity = await supabase
    .from("lesson_activities")
    .insert({
      lesson_id: lesson.data.id,
      activity_type: input.activity.type,
      configuration: withoutType(input.activity),
      sort_order: 0,
    });
  if (activity.error) return { data: null, error: activity.error.message || "Master lesson was created, but its activity could not be saved." };

  return { data: true, error: null };
}

export async function deleteMasterLesson(lessonId: string): Promise<AdminResult<boolean>> {
  if (!supabase) return unavailable();
  const { error } = await supabase.from("curriculum_lessons").delete().eq("id", lessonId);
  if (error) return { data: null, error: error.message || "Master lesson could not be removed. It may already have student progress or classroom overrides." };
  return { data: true, error: null };
}

function withoutType(activity: LessonActivity) {
  const configuration = { ...activity } as Record<string, unknown>;
  delete configuration.type;
  return configuration;
}
