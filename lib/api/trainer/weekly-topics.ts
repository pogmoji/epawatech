import { supabase } from "@/lib/supabase";
import type { TrainerResult } from "./classrooms";

const bucket = "weekly-topic-submissions";
const maxFileSize = 5 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type WeeklyTopic = {
  id: string;
  title: string;
  instructions: string;
  weekKey: string;
  startsAt: string | null;
  dueAt: string;
  published: boolean;
  createdAt: string;
};

export type TrainerWeeklyTopicSubmission = {
  id: string;
  weeklyTopicId: string;
  trainerId: string;
  textResponse: string | null;
  filePath: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  status: "submitted" | "reviewed";
  submittedAt: string;
  updatedAt: string;
  signedFileUrl?: string;
};

export type TrainerWeeklyTopicsData = {
  topics: WeeklyTopic[];
  submissions: TrainerWeeklyTopicSubmission[];
};

type TopicRow = {
  id: string;
  title: string;
  instructions: string;
  week_key: string;
  starts_at: string | null;
  due_at: string;
  published: boolean;
  created_at: string;
};

type SubmissionRow = {
  id: string;
  weekly_topic_id: string;
  trainer_id: string;
  text_response: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  status: "submitted" | "reviewed";
  submitted_at: string;
  updated_at: string;
};

function mapTopic(row: TopicRow): WeeklyTopic {
  return {
    id: row.id,
    title: row.title,
    instructions: row.instructions,
    weekKey: row.week_key,
    startsAt: row.starts_at,
    dueAt: row.due_at,
    published: row.published,
    createdAt: row.created_at,
  };
}

function mapSubmission(row: SubmissionRow): TrainerWeeklyTopicSubmission {
  return {
    id: row.id,
    weeklyTopicId: row.weekly_topic_id,
    trainerId: row.trainer_id,
    textResponse: row.text_response,
    filePath: row.file_path,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    status: row.status,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

function topicSelect() {
  return "id, title, instructions, week_key, starts_at, due_at, published, created_at";
}

function submissionSelect() {
  return "id, weekly_topic_id, trainer_id, text_response, file_path, file_name, file_type, file_size, status, submitted_at, updated_at";
}

function validateFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["pdf", "docx"].includes(extension) || !allowedMimeTypes.has(file.type)) {
    return "Upload a PDF or DOCX file.";
  }
  if (file.size > maxFileSize) return "File must be 5MB or smaller.";
  return null;
}

export async function getTrainerWeeklyTopics(): Promise<TrainerResult<TrainerWeeklyTopicsData>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };
  const client = supabase;

  const [topicsResult, submissionsResult] = await Promise.all([
    client.from("weekly_topics").select(topicSelect()).eq("published", true).order("due_at", { ascending: false }),
    client.from("trainer_weekly_topic_submissions").select(submissionSelect()).order("submitted_at", { ascending: false }),
  ]);

  if (topicsResult.error) return { data: null, error: "Weekly Inputs could not be loaded. Run migration 024 if it has not been applied." };
  if (submissionsResult.error) return { data: null, error: "Weekly topic submissions could not be loaded." };

  const submissions = await Promise.all(((submissionsResult.data ?? []) as unknown as SubmissionRow[]).map(async (row) => {
    const submission = mapSubmission(row);
    if (!submission.filePath) return submission;
    const signed = await client.storage.from(bucket).createSignedUrl(submission.filePath, 60 * 10);
    return { ...submission, signedFileUrl: signed.data?.signedUrl };
  }));

  return {
    data: {
      topics: ((topicsResult.data ?? []) as unknown as TopicRow[]).map(mapTopic),
      submissions,
    },
    error: null,
  };
}

export async function submitWeeklyTopicResponse(input: {
  topicId: string;
  textResponse: string;
  file?: File | null;
}): Promise<TrainerResult<TrainerWeeklyTopicSubmission>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };

  const trimmedText = input.textResponse.trim();
  if (!trimmedText && !input.file) return { data: null, error: "Write a response or upload a PDF/DOCX file." };

  let filePath: string | null = null;
  const file = input.file ?? null;
  if (file) {
    const fileError = validateFile(file);
    if (fileError) return { data: null, error: fileError };
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    filePath = `${userData.user.id}/${input.topicId}/${Date.now()}-${cleanName}`;
    const upload = await supabase.storage.from(bucket).upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upload.error) return { data: null, error: upload.error.message || "File upload failed." };
  }

  const { data, error } = await supabase
    .from("trainer_weekly_topic_submissions")
    .upsert({
      weekly_topic_id: input.topicId,
      trainer_id: userData.user.id,
      text_response: trimmedText || null,
      file_path: filePath,
      file_name: file?.name ?? null,
      file_type: file?.type ?? null,
      file_size: file?.size ?? null,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    }, { onConflict: "weekly_topic_id,trainer_id" })
    .select(submissionSelect())
    .single();

  if (error || !data) return { data: null, error: error?.message || "Weekly topic response could not be submitted." };
  return { data: mapSubmission(data as unknown as SubmissionRow), error: null };
}
