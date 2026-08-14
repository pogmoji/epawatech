import { supabase } from "@/lib/supabase";
import { tracks, type Challenge, type Lesson, type LessonActivity, type Track } from "@/lib/curriculum";
import type { StudentResult } from "./enrollment";

export type ActivityRouteMap = Record<string, string>;

type ActivityRouteRow = {
  id: string;
  curriculum_lessons: Relation<{
    slug: string;
    curriculum_modules: Relation<{
      slug: string;
    }>;
  }>;
};

type Relation<T> = T | T[] | null;

type CurriculumOverrideRow = {
  master_activity_id: string;
  title_override: string | null;
  configuration_override: LessonActivity | null;
  sort_order_override: number | null;
  removed: boolean;
};

type ClassroomCurriculumItemRow = {
  id: string;
  origin: "master" | "custom";
  title: string;
  configuration: LessonActivity | null;
  sort_order: number;
  state: "draft" | "live" | "completed" | "hidden";
  removed: boolean;
};

function one<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getStudentActivityRouteMap(): Promise<StudentResult<ActivityRouteMap>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase
    .from("lesson_activities")
    .select(`
      id,
      curriculum_lessons:lesson_id (
        slug,
        curriculum_modules:module_id ( slug )
      )
    `);

  if (error) return { data: null, error: "Failed to load curriculum activity identifiers." };

  const map = ((data ?? []) as unknown as ActivityRouteRow[]).reduce<ActivityRouteMap>((current, row) => {
    const lesson = one(row.curriculum_lessons);
    const curriculumModule = one(lesson?.curriculum_modules ?? null);
    const moduleSlug = curriculumModule?.slug;
    if (!moduleSlug || !lesson?.slug) return current;
    current[`${moduleSlug}/${lesson.slug}`] = row.id;
    return current;
  }, {});

  return { data: map, error: null };
}

export async function getEffectiveStudentTracks(classroomId: string): Promise<StudentResult<Track[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const [activityMapResult, overridesResult, customItemsResult] = await Promise.all([
    getStudentActivityRouteMap(),
    supabase
      .from("classroom_curriculum_overrides")
      .select("master_activity_id, title_override, configuration_override, sort_order_override, removed")
      .eq("classroom_id", classroomId),
    supabase
      .from("classroom_curriculum_items")
      .select("id, origin, title, configuration, sort_order, state, removed")
      .eq("classroom_id", classroomId)
      .eq("origin", "custom")
      .order("sort_order"),
  ]);

  if (activityMapResult.error || !activityMapResult.data) {
    return { data: null, error: activityMapResult.error || "Failed to load curriculum activity identifiers." };
  }

  if (overridesResult.error) return { data: null, error: "Failed to load classroom curriculum overrides." };
  if (customItemsResult.error) return { data: null, error: "Failed to load classroom curriculum additions." };

  return {
    data: applyEffectiveCurriculum(
      tracks,
      activityMapResult.data,
      (overridesResult.data ?? []) as CurriculumOverrideRow[],
      (customItemsResult.data ?? []) as ClassroomCurriculumItemRow[],
    ),
    error: null,
  };
}

function applyEffectiveCurriculum(
  sourceTracks: Track[],
  activityMap: ActivityRouteMap,
  overrides: CurriculumOverrideRow[],
  customItems: ClassroomCurriculumItemRow[],
) {
  const routeByActivityId = new Map(Object.entries(activityMap).map(([route, id]) => [id, route]));
  const overrideByRoute = new Map(
    overrides.flatMap((override) => {
      const route = routeByActivityId.get(override.master_activity_id);
      return route ? [[route, override] as const] : [];
    }),
  );

  return sourceTracks.map((track, moduleIndex) => {
    const lessonEntries = track.lessons.map((lesson, lessonIndex) => {
      const override = overrideByRoute.get(`${track.slug}/${lesson.slug}`);
      return {
        order: override?.sort_order_override ?? moduleIndex * 100 + lessonIndex,
        removed: override?.removed ?? false,
        lesson: {
          ...lesson,
          title: override?.title_override ?? lesson.title,
          activity: override?.configuration_override ?? lesson.activity,
        } satisfies Lesson,
      };
    });

    const visibleCustomLessons = customItems
      .filter((item) => item.state === "live" && !item.removed && item.configuration && Math.floor(item.sort_order / 100) === moduleIndex)
      .map((item) => ({
        order: item.sort_order,
        removed: false,
        lesson: {
          slug: `custom-${item.id}`,
          title: item.title,
          topics: ["Trainer-added classroom activity"],
          activity: item.configuration as LessonActivity,
        } satisfies Lesson,
      }));

    const challenge = track.challenge ? applyChallengeOverride(track, overrideByRoute) : undefined;

    return {
      ...track,
      lessons: [...lessonEntries, ...visibleCustomLessons]
        .filter((entry) => !entry.removed)
        .sort((a, b) => a.order - b.order)
        .map((entry) => entry.lesson),
      challenge,
    };
  });
}

function applyChallengeOverride(track: Track, overrideByRoute: Map<string, CurriculumOverrideRow>): Challenge | undefined {
  if (!track.challenge) return undefined;
  const override = overrideByRoute.get(`${track.slug}/challenge`);
  if (override?.removed) return undefined;

  return {
    ...track.challenge,
    title: override?.title_override ?? track.challenge.title,
    activity: override?.configuration_override ?? track.challenge.activity,
  };
}
