import { supabase } from "@/lib/supabase";
import type { TrainerResult } from "./classrooms";

const bucket = "trainer-report-attachments";
const maxAttachmentSize = 5 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type TrainerAdminReport = {
  id: string;
  trainerId: string;
  trainerEmail: string | null;
  classroomId: string | null;
  category: string;
  priority: string;
  subject: string;
  message: string;
  attachmentPath: string | null;
  attachmentFileName: string | null;
  attachmentMimeType: string | null;
  attachmentFileSize: number | null;
  status: string;
  emailNotificationStatus: string | null;
  emailSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  signedAttachmentUrl?: string;
};

type ReportRow = {
  id: string;
  trainer_id: string;
  trainer_email: string | null;
  classroom_id: string | null;
  category: string;
  priority: string;
  subject: string;
  message: string;
  attachment_path: string | null;
  attachment_file_name: string | null;
  attachment_mime_type: string | null;
  attachment_file_size: number | null;
  status: string;
  email_notification_status: string | null;
  email_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TrainerAdminReportInput = {
  classroomId: string | null;
  category: string;
  priority: string;
  subject: string;
  message: string;
  attachment?: File | null;
};

function mapReport(row: ReportRow): TrainerAdminReport {
  return {
    id: row.id,
    trainerId: row.trainer_id,
    trainerEmail: row.trainer_email,
    classroomId: row.classroom_id,
    category: row.category,
    priority: row.priority,
    subject: row.subject,
    message: row.message,
    attachmentPath: row.attachment_path,
    attachmentFileName: row.attachment_file_name,
    attachmentMimeType: row.attachment_mime_type,
    attachmentFileSize: row.attachment_file_size,
    status: row.status,
    emailNotificationStatus: row.email_notification_status,
    emailSentAt: row.email_sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function reportSelect() {
  return "id, trainer_id, trainer_email, classroom_id, category, priority, subject, message, attachment_path, attachment_file_name, attachment_mime_type, attachment_file_size, status, email_notification_status, email_sent_at, created_at, updated_at";
}

function validateAttachment(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const allowedExtension = extension && ["pdf", "doc", "docx", "jpg", "jpeg", "png", "webp"].includes(extension);
  if (!allowedExtension || !allowedMimeTypes.has(file.type)) {
    return "Use a PDF, Word document, JPG, PNG, or WEBP attachment.";
  }
  if (file.size > maxAttachmentSize) return "Attachment must be 5MB or smaller.";
  return null;
}

export async function getMyTrainerAdminReports(): Promise<TrainerResult<TrainerAdminReport[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const client = supabase;
  const { data, error } = await client
    .from("trainer_admin_reports")
    .select(reportSelect())
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { data: null, error: "Report history could not be loaded. Run migration 022 if it has not been applied." };

  const reports = await Promise.all(((data ?? []) as unknown as ReportRow[]).map(async (row) => {
    const report = mapReport(row);
    if (!report.attachmentPath) return report;
    const signed = await client.storage.from(bucket).createSignedUrl(report.attachmentPath, 60 * 10);
    return { ...report, signedAttachmentUrl: signed.data?.signedUrl };
  }));

  return { data: reports, error: null };
}

export async function createTrainerAdminReport(input: TrainerAdminReportInput): Promise<TrainerResult<TrainerAdminReport>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };

  let attachmentPath: string | null = null;
  const attachment = input.attachment ?? null;
  if (attachment) {
    const attachmentError = validateAttachment(attachment);
    if (attachmentError) return { data: null, error: attachmentError };
    const cleanName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    attachmentPath = `${userData.user.id}/${Date.now()}-${cleanName}`;
    const upload = await supabase.storage.from(bucket).upload(attachmentPath, attachment, {
      contentType: attachment.type || "application/octet-stream",
      upsert: false,
    });
    if (upload.error) return { data: null, error: upload.error.message || "Attachment upload failed." };
  }

  const { data, error } = await supabase
    .from("trainer_admin_reports")
    .insert({
      trainer_id: userData.user.id,
      trainer_email: userData.user.email ?? null,
      classroom_id: input.classroomId,
      category: input.category,
      priority: input.priority,
      subject: input.subject.trim(),
      message: input.message.trim(),
      attachment_path: attachmentPath,
      attachment_file_name: attachment?.name ?? null,
      attachment_mime_type: attachment?.type || null,
      attachment_file_size: attachment?.size ?? null,
      email_notification_status: "not_configured",
    })
    .select(reportSelect())
    .single();

  if (error || !data) return { data: null, error: error?.message || "Report could not be submitted." };
  return { data: mapReport(data as unknown as ReportRow), error: null };
}
