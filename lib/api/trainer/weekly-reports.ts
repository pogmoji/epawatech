import { supabase } from "@/lib/supabase";
import type { TrainerResult } from "./classrooms";

const bucket = "classroom-weekly-report-attachments";
const maxFileSize = 5 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type ClassroomWeeklyReport = {
  id: string;
  classroomId: string;
  weekKey: string;
  submittedByTrainerId: string;
  reportText: string | null;
  filePath: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  status: "submitted" | "reviewed";
  submittedAt: string;
  updatedAt: string;
  signedFileUrl?: string;
};

type ReportRow = {
  id: string;
  classroom_id: string;
  week_key: string;
  submitted_by_trainer_id: string;
  report_text: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  status: "submitted" | "reviewed";
  submitted_at: string;
  updated_at: string;
};

function reportSelect() {
  return "id, classroom_id, week_key, submitted_by_trainer_id, report_text, file_path, file_name, file_type, file_size, status, submitted_at, updated_at";
}

function mapReport(row: ReportRow): ClassroomWeeklyReport {
  return {
    id: row.id,
    classroomId: row.classroom_id,
    weekKey: row.week_key,
    submittedByTrainerId: row.submitted_by_trainer_id,
    reportText: row.report_text,
    filePath: row.file_path,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    status: row.status,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

function validateFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["pdf", "docx"].includes(extension) || !allowedMimeTypes.has(file.type)) {
    return "Upload a PDF or DOCX file.";
  }
  if (file.size > maxFileSize) return "File must be 5MB or smaller.";
  return null;
}

export async function getClassroomWeeklyReports(classroomId: string): Promise<TrainerResult<ClassroomWeeklyReport[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };
  const client = supabase;

  const { data, error } = await client
    .from("classroom_weekly_reports")
    .select(reportSelect())
    .eq("classroom_id", classroomId)
    .order("submitted_at", { ascending: false });

  if (error) return { data: null, error: "Classroom weekly reports could not be loaded. Run migration 025 if it has not been applied." };

  const reports = await Promise.all(((data ?? []) as unknown as ReportRow[]).map(async (row) => {
    const report = mapReport(row);
    if (!report.filePath) return report;
    const signed = await client.storage.from(bucket).createSignedUrl(report.filePath, 60 * 10);
    return { ...report, signedFileUrl: signed.data?.signedUrl };
  }));

  return { data: reports, error: null };
}

export async function submitClassroomWeeklyReport(input: {
  classroomId: string;
  weekKey: string;
  reportText: string;
  file?: File | null;
}): Promise<TrainerResult<ClassroomWeeklyReport>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };

  const trimmedText = input.reportText.trim();
  if (!input.weekKey.trim()) return { data: null, error: "Enter the report week." };
  if (!trimmedText && !input.file) return { data: null, error: "Write a report or upload a PDF/DOCX file." };

  let filePath: string | null = null;
  const file = input.file ?? null;
  if (file) {
    const fileError = validateFile(file);
    if (fileError) return { data: null, error: fileError };
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    filePath = `${input.classroomId}/${input.weekKey.trim()}/${Date.now()}-${cleanName}`;
    const upload = await supabase.storage.from(bucket).upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upload.error) return { data: null, error: upload.error.message || "File upload failed." };
  }

  const { data, error } = await supabase
    .from("classroom_weekly_reports")
    .upsert({
      classroom_id: input.classroomId,
      week_key: input.weekKey.trim(),
      submitted_by_trainer_id: userData.user.id,
      report_text: trimmedText || null,
      file_path: filePath,
      file_name: file?.name ?? null,
      file_type: file?.type ?? null,
      file_size: file?.size ?? null,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    }, { onConflict: "classroom_id,week_key" })
    .select(reportSelect())
    .single();

  if (error || !data) return { data: null, error: error?.message || "Only the active Lead Trainer can submit the official classroom weekly report." };
  return { data: mapReport(data as unknown as ReportRow), error: null };
}
