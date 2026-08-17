import { supabase } from "@/lib/supabase";
import { tracks as staticTracks, type LessonActivity, type Track } from "@/lib/curriculum";

type Result<T> = { data: T; error: null } | { data: null; error: string };

type WeekRow = { id: string; week_number: number; title: string; description: string | null; icon: string | null; sort_order: number };
type ModuleRow = { id: string; week_id: string; slug: string; title: string; description: string | null; sort_order: number };
type LessonRow = { id: string; module_id: string; slug: string; title: string; topics: string[]; sort_order: number; is_challenge: boolean; time_limit_seconds: number | null };
type ActivityRow = { id: string; lesson_id: string; activity_type: LessonActivity["type"]; configuration: Record<string, unknown>; sort_order: number; version: number | null };

export type MasterCurriculumLesson = LessonRow & {
  activity_id: string;
  activity_version: number;
  activity: LessonActivity;
};

export type MasterCurriculumModule = ModuleRow & {
  week: WeekRow;
  lessons: MasterCurriculumLesson[];
};

export function activityWithType(type: LessonActivity["type"], configuration: Record<string, unknown> | null): LessonActivity {
  return { type, ...(configuration ?? {}) } as LessonActivity;
}

function unavailable<T>(): Result<T> {
  return { data: null, error: "Supabase is not configured for this deployment." };
}

export async function getMasterCurriculumModules(): Promise<Result<MasterCurriculumModule[]>> {
  if (!supabase) return unavailable();

  const [weeks, modules, lessons, activities] = await Promise.all([
    supabase.from("curriculum_weeks").select("id, week_number, title, description, icon, sort_order").order("sort_order"),
    supabase.from("curriculum_modules").select("id, week_id, slug, title, description, sort_order").order("sort_order"),
    supabase.from("curriculum_lessons").select("id, module_id, slug, title, topics, sort_order, is_challenge, time_limit_seconds").order("sort_order"),
    supabase.from("lesson_activities").select("id, lesson_id, activity_type, configuration, sort_order, version").order("sort_order"),
  ]);

  const error = weeks.error || modules.error || lessons.error || activities.error;
  if (error) return { data: null, error: "Master curriculum could not be loaded. Check migrations 004 and 004b." };

  const weeksById = new Map(((weeks.data ?? []) as WeekRow[]).map((week) => [week.id, week]));
  const activityByLessonId = new Map(((activities.data ?? []) as unknown as ActivityRow[]).map((activity) => [activity.lesson_id, activity]));
  const lessonRows = (lessons.data ?? []) as LessonRow[];

  const result = ((modules.data ?? []) as ModuleRow[]).flatMap((module) => {
    const week = weeksById.get(module.week_id);
    if (!week) return [];
    return [{
      ...module,
      week,
      lessons: lessonRows
        .filter((lesson) => lesson.module_id === module.id)
        .flatMap((lesson) => {
          const activity = activityByLessonId.get(lesson.id);
          if (!activity) return [];
          return [{
            ...lesson,
            activity_id: activity.id,
            activity_version: activity.version ?? 1,
            activity: activityWithType(activity.activity_type, activity.configuration),
          }];
        })
        .sort((a, b) => a.sort_order - b.sort_order),
    }];
  });

  return { data: result, error: null };
}

export async function getMasterTracks(): Promise<Track[]> {
  const result = await getMasterCurriculumModules();
  if (result.error || !result.data || !result.data.length) return staticTracks;

  return result.data.map((module) => {
    const lessons = module.lessons.filter((lesson) => !lesson.is_challenge);
    const challenge = module.lessons.find((lesson) => lesson.is_challenge);
    return {
      slug: module.slug,
      title: module.title,
      description: module.description ?? module.week.description ?? "",
      weekNumber: module.week.week_number,
      icon: module.week.icon || "Monitor",
      lessons: lessons.map((lesson) => ({
        slug: lesson.slug,
        title: lesson.title,
        topics: lesson.topics,
        activity: lesson.activity,
      })),
      challenge: challenge
        ? {
            slug: challenge.slug,
            title: challenge.title,
            description: module.description ?? "",
            activity: challenge.activity,
            timeLimitSeconds: challenge.time_limit_seconds ?? undefined,
          }
        : undefined,
    };
  });
}
