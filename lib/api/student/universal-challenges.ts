import { supabase } from "@/lib/supabase";
import type { StudentResult } from "./enrollment";

export type ChallengeSubmissionType = "none" | "text" | "link" | "file" | "code" | "image";

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
  submissionType: ChallengeSubmissionType;
  submissionPrompt: string;
  allowedFileTypes: string[];
  maxFileSize: number;
};

export type StudentChallengeProgress = {
  id: string;
  studentId: string;
  challengeId: string;
  status: "available" | "in_progress" | "completed";
  startedAt: string | null;
  completedAt: string | null;
};

export type StudentChallengeSubmission = {
  id: string;
  studentId: string;
  challengeId: string;
  textResponse: string | null;
  urlResponse: string | null;
  filePath: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  status: "submitted" | "reviewed" | "accepted" | "needs_revision";
  submittedAt: string;
};

export type ChallengeRoadmapLevel = ChallengeLevel & {
  unlocked: boolean;
  completedRequired: number;
  requiredTotal: number;
  challenges: (UniversalChallenge & { status: StudentChallengeProgress["status"]; locked: boolean; submission: StudentChallengeSubmission | null })[];
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
  submission_type?: ChallengeSubmissionType | null;
  submission_prompt?: string | null;
  allowed_file_types?: string[] | null;
  max_file_size?: number | null;
};

type ProgressRow = {
  id: string;
  student_id: string;
  challenge_id: string;
  status: StudentChallengeProgress["status"];
  started_at: string | null;
  completed_at: string | null;
};

type SubmissionRow = {
  id: string;
  student_id: string;
  challenge_id: string;
  text_response: string | null;
  url_response: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  status: StudentChallengeSubmission["status"];
  submitted_at: string;
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
    submissionType: row.submission_type ?? "text",
    submissionPrompt: row.submission_prompt ?? "",
    allowedFileTypes: row.allowed_file_types ?? [],
    maxFileSize: row.max_file_size ?? 5 * 1024 * 1024,
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

function mapSubmission(row: SubmissionRow): StudentChallengeSubmission {
  return {
    id: row.id,
    studentId: row.student_id,
    challengeId: row.challenge_id,
    textResponse: row.text_response,
    urlResponse: row.url_response,
    filePath: row.file_path,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    status: row.status,
    submittedAt: row.submitted_at,
  };
}

function missingUniversalChallengeTables(message: string) {
  return message.includes("challenge_levels") || message.includes("student_challenge_progress") || message.includes("challenges");
}

export async function getUniversalChallengeRoadmap(): Promise<StudentResult<ChallengeRoadmapLevel[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const [levelsRes, challengesRes, progressRes, submissionsRes] = await Promise.all([
    supabase.from("challenge_levels").select("id, name, slug, difficulty, sort_order, is_active").eq("is_active", true).order("sort_order"),
    supabase.from("challenges").select("id, level_id, title, description, instructions, sort_order, is_required, is_published, submission_type, submission_prompt, allowed_file_types, max_file_size").eq("is_published", true).order("sort_order"),
    supabase.from("student_challenge_progress").select("id, student_id, challenge_id, status, started_at, completed_at"),
    supabase.from("student_challenge_submissions").select("id, student_id, challenge_id, text_response, url_response, file_path, file_name, file_type, file_size, status, submitted_at").order("submitted_at", { ascending: false }),
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
  const submissions = new Map<string, StudentChallengeSubmission>();
  if (!submissionsRes.error) {
    for (const submission of ((submissionsRes.data ?? []) as SubmissionRow[]).map(mapSubmission)) {
      if (!submissions.has(submission.challengeId)) submissions.set(submission.challengeId, submission);
    }
  }
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
        submission: submissions.get(challenge.id) ?? null,
      })),
    };
  });

  return { data: roadmap, error: null };
}

export async function getPublicUniversalChallengeRoadmap(): Promise<StudentResult<ChallengeRoadmapLevel[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const [levelsRes, challengesRes] = await Promise.all([
    supabase.from("challenge_levels").select("id, name, slug, difficulty, sort_order, is_active").eq("is_active", true).order("sort_order"),
    supabase.from("challenges").select("id, level_id, title, description, instructions, sort_order, is_required, is_published, submission_type, submission_prompt, allowed_file_types, max_file_size").eq("is_published", true).order("sort_order"),
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
          submission: null,
        })),
      };
    }),
    error: null,
  };
}

export async function uploadUniversalChallengeSubmissionFile(file: File): Promise<StudentResult<{ path: string }>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userData.user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from("universal-challenge-submissions").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (upload.error) return { data: null, error: upload.error.message || "File upload failed." };
  return { data: { path }, error: null };
}

export async function submitUniversalChallenge(input: {
  challengeId: string;
  textResponse?: string;
  urlResponse?: string;
  file?: File | null;
}): Promise<StudentResult<StudentChallengeSubmission>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };

  let filePayload: Pick<SubmissionRow, "file_path" | "file_name" | "file_type" | "file_size"> = {
    file_path: null,
    file_name: null,
    file_type: null,
    file_size: null,
  };

  if (input.file) {
    const upload = await uploadUniversalChallengeSubmissionFile(input.file);
    if (upload.error || !upload.data) return { data: null, error: upload.error || "File upload failed." };
    filePayload = {
      file_path: upload.data.path,
      file_name: input.file.name,
      file_type: input.file.type || "application/octet-stream",
      file_size: input.file.size,
    };
  }

  const { data, error } = await supabase
    .from("student_challenge_submissions")
    .upsert({
      student_id: userData.user.id,
      challenge_id: input.challengeId,
      text_response: input.textResponse?.trim() || null,
      url_response: input.urlResponse?.trim() || null,
      ...filePayload,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    }, { onConflict: "student_id,challenge_id" })
    .select("id, student_id, challenge_id, text_response, url_response, file_path, file_name, file_type, file_size, status, submitted_at")
    .single();

  if (error) return { data: null, error: error.message || "Challenge submission could not be saved." };

  await setUniversalChallengeProgress(input.challengeId, "completed");
  return { data: mapSubmission(data as SubmissionRow), error: null };
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
