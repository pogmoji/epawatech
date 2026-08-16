import { supabase } from "@/lib/supabase";
import type { LessonActivity } from "@/lib/curriculum";
import { TrainerResult } from "./classrooms";

export type CurriculumItem = {
  id: string;
  master_activity_id: string | null;
  origin: "master" | "custom";
  title: string;
  configuration: LessonActivity | null;
  sort_order: number;
  state: "draft" | "live" | "completed" | "hidden";
  removed: boolean;
  is_unlocked: boolean;
};

export type CurriculumOverride = {
  id: string;
  master_activity_id: string;
  title_override: string | null;
  configuration_override: LessonActivity | null;
  sort_order_override: number | null;
  removed: boolean;
  is_unlocked: boolean;
};

export type MasterActivityRoute = {
  id: string;
  route: string;
};

export type ClassroomCurriculumData = {
  items: CurriculumItem[];
  overrides: CurriculumOverride[];
  masterActivities: MasterActivityRoute[];
};

export type CurriculumSaveItem = {
  moduleId: string;
  moduleIndex: number;
  itemId: string;
  itemIndex: number;
  title: string;
  origin: "core" | "trainer";
  removed?: boolean;
  isUnlocked?: boolean;
  masterTitle?: string;
  activity?: LessonActivity;
};

type MasterActivityRow = {
  id: string;
  curriculum_lessons: Relation<{
    slug: string;
    curriculum_modules: Relation<{
      slug: string;
    }>;
  }>;
};

type Relation<T> = T | T[] | null;

function one<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function routeFromItem(moduleId: string, itemId: string) {
  return itemId.startsWith(`${moduleId}-`) ? `${moduleId}/${itemId.slice(moduleId.length + 1)}` : null;
}

async function getMasterActivityRoutes(): Promise<TrainerResult<MasterActivityRoute[]>> {
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

  if (error) return { data: null, error: "Failed to load master curriculum activity IDs." };

  const routes = ((data ?? []) as unknown as MasterActivityRow[]).flatMap((row) => {
    const lesson = one(row.curriculum_lessons);
    const curriculumModule = one(lesson?.curriculum_modules ?? null);
    const moduleSlug = curriculumModule?.slug;
    if (!moduleSlug || !lesson?.slug) return [];
    return [{ id: row.id, route: `${moduleSlug}/${lesson.slug}` }];
  });

  return { data: routes, error: null };
}

export async function getClassroomCurriculum(classroomId: string): Promise<TrainerResult<ClassroomCurriculumData>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const [itemsResult, overridesResult, masterResult] = await Promise.all([
    supabase
      .from("classroom_curriculum_items")
      .select("id, master_activity_id, origin, title, configuration, sort_order, state, removed, is_unlocked")
      .eq("classroom_id", classroomId)
      .order("sort_order"),
    supabase
      .from("classroom_curriculum_overrides")
      .select("id, master_activity_id, title_override, configuration_override, sort_order_override, removed, is_unlocked")
      .eq("classroom_id", classroomId),
    getMasterActivityRoutes(),
  ]);

  if (itemsResult.error) return { data: null, error: "Failed to fetch curriculum additions." };
  if (overridesResult.error) return { data: null, error: "Failed to fetch curriculum overrides." };
  if (masterResult.error || !masterResult.data) return { data: null, error: masterResult.error || "Failed to load master curriculum activity IDs." };

  return {
    data: {
      items: (itemsResult.data ?? []) as CurriculumItem[],
      overrides: (overridesResult.data ?? []) as CurriculumOverride[],
      masterActivities: masterResult.data,
    },
    error: null,
  };
}

export async function saveClassroomCurriculum(classroomId: string, items: CurriculumSaveItem[]): Promise<TrainerResult<boolean>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };

  const masterResult = await getMasterActivityRoutes();
  if (masterResult.error) return { data: null, error: masterResult.error };

  if (!masterResult.data) return { data: null, error: "Failed to load master curriculum activity IDs." };

  const activityIdByRoute = new Map(masterResult.data.map((activity) => [activity.route, activity.id]));
  const overrides = items.flatMap((item) => {
    if (item.origin !== "core") return [];
    const route = routeFromItem(item.moduleId, item.itemId);
    const masterActivityId = route ? activityIdByRoute.get(route) : null;
    if (!masterActivityId) return [];

    return [{
      classroom_id: classroomId,
      master_activity_id: masterActivityId,
      title_override: item.title !== item.masterTitle ? item.title : null,
      configuration_override: item.activity ?? null,
      sort_order_override: item.moduleIndex * 100 + item.itemIndex,
      removed: Boolean(item.removed),
      is_unlocked: item.isUnlocked !== false,
      created_by: userData.user.id,
    }];
  });

  if (overrides.length) {
    const { error } = await supabase
      .from("classroom_curriculum_overrides")
      .upsert(overrides, { onConflict: "classroom_id,master_activity_id" });
    if (error) return { data: null, error: "Failed to save curriculum overrides." };
  }

  const { error: deleteError } = await supabase
    .from("classroom_curriculum_items")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("origin", "custom");
  if (deleteError) return { data: null, error: "Failed to replace trainer-added curriculum items." };

  const customItems = items
    .filter((item) => item.origin === "trainer" && !item.removed)
    .map((item) => ({
      classroom_id: classroomId,
      master_activity_id: null,
      origin: "custom",
      title: item.title.trim(),
      configuration: item.activity ?? null,
      sort_order: item.moduleIndex * 100 + item.itemIndex,
      state: "live",
      removed: false,
      is_unlocked: item.isUnlocked !== false,
      created_by: userData.user.id,
    }));

  if (customItems.length) {
    const { error } = await supabase.from("classroom_curriculum_items").insert(customItems);
    if (error) return { data: null, error: "Failed to save trainer-added curriculum items." };
  }

  return { data: true, error: null };
}
