import { supabase } from "@/lib/supabase";
import type { StudentResult } from "./enrollment";

export type ChallengeLevel = {
  id: string;
  name: string;
  slug: string;
  difficulty: "easy" | "medium" | "hard" | "extreme";
  sortOrder: number;
  isActive: boolean;
};

export type UniversalChallenge = {
  id: string;
  levelId: string;
  title: string;
  description: string;
  instructions: string;
  sortOrder: number;
  isRequired: boolean;
  isPublished: boolean;
};

export type StudentChallengeProgress = {
  id: string;
  studentId: string;
  challengeId: string;
  status: "available" | "in_progress" | "completed";
  startedAt: string | null;
  completedAt: string | null;
};

export type ChallengeRoadmapLevel = ChallengeLevel & {
  unlocked: boolean;
  completedRequired: number;
  requiredTotal: number;
  challenges: (UniversalChallenge & { status: StudentChallengeProgress["status"]; locked: boolean })[];
};

type LevelRow = {
  id: string;
  name: string;
  slug: string;
  difficulty: ChallengeLevel["difficulty"];
  sort_order: number;
  is_active: boolean;
};

type ChallengeRow = {
  id: string;
  level_id: string;
  title: string;
  description: string;
  instructions: string;
  sort_order: number;
  is_required: boolean;
  is_published: boolean;
};

type ProgressRow = {
  id: string;
  student_id: string;
  challenge_id: string;
  status: StudentChallengeProgress["status"];
  started_at: string | null;
  completed_at: string | null;
};

function mapLevel(row: LevelRow): ChallengeLevel {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    difficulty: row.difficulty,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

function mapChallenge(row: ChallengeRow): UniversalChallenge {
  return {
    id: row.id,
    levelId: row.level_id,
    title: row.title,
    description: row.description,
    instructions: row.instructions,
    sortOrder: row.sort_order,
    isRequired: row.is_required,
    isPublished: row.is_published,
  };
}

function mapProgress(row: ProgressRow): StudentChallengeProgress {
  return {
    id: row.id,
    studentId: row.student_id,
    challengeId: row.challenge_id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function missingUniversalChallengeTables(message: string) {
  return message.includes("challenge_levels") || message.includes("student_challenge_progress") || message.includes("challenges");
}

export async function getUniversalChallengeRoadmap(): Promise<StudentResult<ChallengeRoadmapLevel[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const [levelsRes, challengesRes, progressRes] = await Promise.all([
    supabase.from("challenge_levels").select("id, name, slug, difficulty, sort_order, is_active").eq("is_active", true).order("sort_order"),
    supabase.from("challenges").select("id, level_id, title, description, instructions, sort_order, is_required, is_published").eq("is_published", true).order("sort_order"),
    supabase.from("student_challenge_progress").select("id, student_id, challenge_id, status, started_at, completed_at"),
  ]);

  const firstError = levelsRes.error ?? challengesRes.error ?? progressRes.error;
  if (firstError) {
    return {
      data: null,
      error: missingUniversalChallengeTables(firstError.message)
        ? "Universal challenges are not ready yet. Run migration 020 in Supabase, then refresh."
        : "Universal challenges could not be loaded.",
    };
  }

  const levels = ((levelsRes.data ?? []) as LevelRow[]).map(mapLevel);
  const challenges = ((challengesRes.data ?? []) as ChallengeRow[]).map(mapChallenge);
  const progress = new Map(((progressRes.data ?? []) as ProgressRow[]).map((row) => [row.challenge_id, mapProgress(row)]));
  const completedRequiredByLevel = new Map<string, number>();
  const requiredTotalByLevel = new Map<string, number>();

  for (const challenge of challenges) {
    if (!challenge.isRequired) continue;
    requiredTotalByLevel.set(challenge.levelId, (requiredTotalByLevel.get(challenge.levelId) ?? 0) + 1);
    if (progress.get(challenge.id)?.status === "completed") {
      completedRequiredByLevel.set(challenge.levelId, (completedRequiredByLevel.get(challenge.levelId) ?? 0) + 1);
    }
  }

  let previousLevelsComplete = true;
  const roadmap = levels.map((level) => {
    const levelChallenges = challenges
      .filter((challenge) => challenge.levelId === level.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const requiredTotal = requiredTotalByLevel.get(level.id) ?? 0;
    const completedRequired = completedRequiredByLevel.get(level.id) ?? 0;
    const unlocked = previousLevelsComplete;
    previousLevelsComplete = previousLevelsComplete && completedRequired >= requiredTotal;

    return {
      ...level,
      unlocked,
      requiredTotal,
      completedRequired,
      challenges: levelChallenges.map((challenge) => ({
        ...challenge,
        locked: !unlocked,
        status: progress.get(challenge.id)?.status ?? "available",
      })),
    };
  });

  return { data: roadmap, error: null };
}

export async function getPublicUniversalChallengeRoadmap(): Promise<StudentResult<ChallengeRoadmapLevel[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const [levelsRes, challengesRes] = await Promise.all([
    supabase.from("challenge_levels").select("id, name, slug, difficulty, sort_order, is_active").eq("is_active", true).order("sort_order"),
    supabase.from("challenges").select("id, level_id, title, description, instructions, sort_order, is_required, is_published").eq("is_published", true).order("sort_order"),
  ]);

  const firstError = levelsRes.error ?? challengesRes.error;
  if (firstError) {
    return {
      data: null,
      error: missingUniversalChallengeTables(firstError.message)
        ? "Universal challenges are not ready yet."
        : "Universal challenges could not be loaded.",
    };
  }

  const levels = ((levelsRes.data ?? []) as LevelRow[]).map(mapLevel);
  const challenges = ((challengesRes.data ?? []) as ChallengeRow[]).map(mapChallenge);

  return {
    data: levels.map((level) => {
      const levelChallenges = challenges
        .filter((challenge) => challenge.levelId === level.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return {
        ...level,
        unlocked: true,
        completedRequired: 0,
        requiredTotal: levelChallenges.filter((challenge) => challenge.isRequired).length,
        challenges: levelChallenges.map((challenge) => ({
          ...challenge,
          locked: false,
          status: "available" as const,
        })),
      };
    }),
    error: null,
  };
}

export async function setUniversalChallengeProgress(challengeId: string, status: "in_progress" | "completed"): Promise<StudentResult<StudentChallengeProgress>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase.rpc("set_student_challenge_progress", {
    p_challenge_id: challengeId,
    p_status: status,
  });

  if (error) {
    return {
      data: null,
      error: error.message || "Challenge progress could not be saved.",
    };
  }

  return { data: mapProgress(data as ProgressRow), error: null };
}
