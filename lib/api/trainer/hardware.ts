import { supabase } from "@/lib/supabase";
import type { TrainerResult } from "./classrooms";

export type HardwareSession = {
  id: string;
  classroomId: string;
  curriculumItemId: string | null;
  sessionDate: string;
  notes: string | null;
  createdAt: string;
  evidenceCount: number;
};

export type HardwareEvidence = {
  id: string;
  hardwareSessionId: string | null;
  studentId: string | null;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  createdAt: string;
  signedUrl?: string;
};

type SessionRow = {
  id: string;
  classroom_id: string;
  curriculum_item_id: string | null;
  session_date: string;
  notes: string | null;
  created_at: string;
};

type EvidenceRow = {
  id: string;
  hardware_session_id: string | null;
  student_id: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number | null;
  created_at: string;
};

function mapSession(row: SessionRow, evidenceCount = 0): HardwareSession {
  return {
    id: row.id,
    classroomId: row.classroom_id,
    curriculumItemId: row.curriculum_item_id,
    sessionDate: row.session_date,
    notes: row.notes,
    createdAt: row.created_at,
    evidenceCount,
  };
}

function mapEvidence(row: EvidenceRow): HardwareEvidence {
  return {
    id: row.id,
    hardwareSessionId: row.hardware_session_id,
    studentId: row.student_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

export async function getHardwareSessions(classroomId: string): Promise<TrainerResult<HardwareSession[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const [sessionsRes, evidenceRes] = await Promise.all([
    supabase
      .from("hardware_sessions")
      .select("id, classroom_id, curriculum_item_id, session_date, notes, created_at")
      .eq("classroom_id", classroomId)
      .order("session_date", { ascending: false }),
    supabase
      .from("hardware_evidence")
      .select("hardware_session_id")
      .not("hardware_session_id", "is", null),
  ]);

  if (sessionsRes.error || evidenceRes.error) return { data: null, error: "Hardware sessions could not be loaded." };

  const evidenceCounts = new Map<string, number>();
  for (const item of (evidenceRes.data ?? []) as { hardware_session_id: string }[]) {
    evidenceCounts.set(item.hardware_session_id, (evidenceCounts.get(item.hardware_session_id) ?? 0) + 1);
  }

  return {
    data: ((sessionsRes.data ?? []) as SessionRow[]).map((row) => mapSession(row, evidenceCounts.get(row.id) ?? 0)),
    error: null,
  };
}

export async function createHardwareSession(input: {
  classroomId: string;
  sessionDate: string;
  notes: string;
}): Promise<TrainerResult<HardwareSession>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };

  const { data, error } = await supabase
    .from("hardware_sessions")
    .insert({
      classroom_id: input.classroomId,
      session_date: input.sessionDate,
      notes: input.notes.trim() || null,
      created_by: userData.user.id,
    })
    .select("id, classroom_id, curriculum_item_id, session_date, notes, created_at")
    .single();

  if (error || !data) return { data: null, error: error?.message || "Hardware session could not be created." };
  return { data: mapSession(data as SessionRow), error: null };
}

export async function updateHardwareSession(input: {
  sessionId: string;
  classroomId: string;
  sessionDate: string;
  notes: string;
}): Promise<TrainerResult<HardwareSession>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase
    .from("hardware_sessions")
    .update({
      session_date: input.sessionDate,
      notes: input.notes.trim() || null,
    })
    .eq("id", input.sessionId)
    .eq("classroom_id", input.classroomId)
    .select("id, classroom_id, curriculum_item_id, session_date, notes, created_at")
    .single();

  if (error || !data) return { data: null, error: error?.message || "Hardware session could not be updated." };
  return { data: mapSession(data as SessionRow), error: null };
}

export async function getHardwareEvidence(sessionId: string): Promise<TrainerResult<HardwareEvidence[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };
  const client = supabase;

  const { data, error } = await client
    .from("hardware_evidence")
    .select("id, hardware_session_id, student_id, storage_path, file_name, mime_type, file_size, created_at")
    .eq("hardware_session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: "Evidence could not be loaded." };

  const evidence = await Promise.all(((data ?? []) as EvidenceRow[]).map(async (row) => {
    const item = mapEvidence(row);
    const signed = await client.storage.from("hardware-evidence").createSignedUrl(item.storagePath, 60 * 10);
    return { ...item, signedUrl: signed.data?.signedUrl };
  }));

  return { data: evidence, error: null };
}

export async function uploadHardwareEvidence(input: {
  classroomId: string;
  sessionId: string;
  file: File;
}): Promise<TrainerResult<HardwareEvidence>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };

  const cleanName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${input.classroomId}/${input.sessionId}/${Date.now()}-${cleanName}`;
  const upload = await supabase.storage.from("hardware-evidence").upload(storagePath, input.file, { upsert: false });
  if (upload.error) return { data: null, error: upload.error.message || "Evidence upload failed." };

  const { data, error } = await supabase
    .from("hardware_evidence")
    .insert({
      hardware_session_id: input.sessionId,
      uploaded_by: userData.user.id,
      storage_path: storagePath,
      file_name: input.file.name,
      mime_type: input.file.type || "application/octet-stream",
      file_size: input.file.size,
    })
    .select("id, hardware_session_id, student_id, storage_path, file_name, mime_type, file_size, created_at")
    .single();

  if (error || !data) return { data: null, error: error?.message || "Evidence metadata could not be saved." };
  return { data: mapEvidence(data as EvidenceRow), error: null };
}
