import { supabase } from "@/lib/supabase";
import { isValidPhoneNumber, normalizePhoneNumber } from "@/lib/auth";
import type { TrainerResult } from "./classrooms";

export const TRAINER_CERTIFICATE_BUCKET = "trainer-certificates";
export const TRAINER_CERTIFICATE_MAX_BYTES = 5 * 1024 * 1024;

export type TrainerProfileDetails = {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  certificatePath: string | null;
  certificateFileName: string | null;
  certificateMimeType: string | null;
  certificateFileSize: number | null;
  certificateUploadedAt: string | null;
  signedCertificateUrl?: string | null;
};

type TrainerProfileRow = {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  certificate_path: string | null;
  certificate_file_name: string | null;
  certificate_mime_type: string | null;
  certificate_file_size: number | null;
  certificate_uploaded_at: string | null;
};

export type TrainerProfileInput = {
  fullName: string;
  phoneNumber: string;
};

function profileSelect() {
  return "id, full_name, phone_number, certificate_path, certificate_file_name, certificate_mime_type, certificate_file_size, certificate_uploaded_at";
}

async function mapProfile(row: TrainerProfileRow): Promise<TrainerProfileDetails> {
  let signedCertificateUrl: string | null = null;
  if (supabase && row.certificate_path) {
    const signed = await supabase.storage
      .from(TRAINER_CERTIFICATE_BUCKET)
      .createSignedUrl(row.certificate_path, 60 * 10);
    signedCertificateUrl = signed.data?.signedUrl ?? null;
  }

  return {
    id: row.id,
    fullName: row.full_name?.trim() || "",
    phoneNumber: row.phone_number,
    certificatePath: row.certificate_path,
    certificateFileName: row.certificate_file_name,
    certificateMimeType: row.certificate_mime_type,
    certificateFileSize: row.certificate_file_size,
    certificateUploadedAt: row.certificate_uploaded_at,
    signedCertificateUrl,
  };
}

function certificateFieldsUnavailable(message: string) {
  return message.includes("certificate_path") || message.includes("certificate_file_name");
}

export function validateTrainerCertificate(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "pdf" || file.type !== "application/pdf") {
    return "Upload a PDF certificate.";
  }
  if (file.size > TRAINER_CERTIFICATE_MAX_BYTES) {
    return "Certificate PDF must be 5 MB or smaller.";
  }
  return null;
}

export async function getMyTrainerProfile(): Promise<TrainerResult<TrainerProfileDetails>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase
    .from("profiles")
    .select(profileSelect())
    .eq("role", "trainer")
    .maybeSingle();

  if (error) {
    const message = certificateFieldsUnavailable(error.message)
      ? "Trainer certificate fields are not ready yet. Run migration 026 in Supabase, then refresh."
      : "Your trainer profile could not be loaded.";
    return { data: null, error: message };
  }

  if (!data) return { data: null, error: "Your trainer profile could not be found." };
  return { data: await mapProfile(data as unknown as TrainerProfileRow), error: null };
}

export async function updateMyTrainerProfile(input: TrainerProfileInput): Promise<TrainerResult<TrainerProfileDetails>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const fullName = input.fullName.trim();
  const phoneNumber = normalizePhoneNumber(input.phoneNumber);
  if (fullName.length < 2) return { data: null, error: "Enter your display name." };
  if (fullName.length > 120) return { data: null, error: "Display name is too long." };
  if (!isValidPhoneNumber(phoneNumber)) {
    return { data: null, error: "Enter a phone number in international format, for example +254712345678." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone_number: phoneNumber })
    .eq("role", "trainer")
    .select(profileSelect())
    .single();

  if (error) {
    const message = certificateFieldsUnavailable(error.message)
      ? "Trainer certificate fields are not ready yet. Run migration 026 in Supabase, then try again."
      : "Your trainer profile could not be saved.";
    return { data: null, error: message };
  }

  return { data: await mapProfile(data as unknown as TrainerProfileRow), error: null };
}

export async function uploadMyTrainerCertificate(file: File, previousPath?: string | null): Promise<TrainerResult<TrainerProfileDetails>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };

  const certificateError = validateTrainerCertificate(file);
  if (certificateError) return { data: null, error: certificateError };

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const certificatePath = `${userData.user.id}/${Date.now()}-${cleanName}`;
  const upload = await supabase.storage.from(TRAINER_CERTIFICATE_BUCKET).upload(certificatePath, file, {
    contentType: "application/pdf",
    upsert: false,
  });

  if (upload.error) return { data: null, error: upload.error.message || "Certificate upload failed." };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      certificate_path: certificatePath,
      certificate_file_name: file.name,
      certificate_mime_type: "application/pdf",
      certificate_file_size: file.size,
      certificate_uploaded_at: new Date().toISOString(),
    })
    .eq("id", userData.user.id)
    .eq("role", "trainer")
    .select(profileSelect())
    .single();

  if (error) return { data: null, error: "Certificate uploaded, but your profile could not be updated." };

  if (previousPath && previousPath !== certificatePath) {
    void supabase.storage.from(TRAINER_CERTIFICATE_BUCKET).remove([previousPath]);
  }

  return { data: await mapProfile(data as unknown as TrainerProfileRow), error: null };
}

export async function removeMyTrainerCertificate(path: string): Promise<TrainerResult<TrainerProfileDetails>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      certificate_path: null,
      certificate_file_name: null,
      certificate_mime_type: null,
      certificate_file_size: null,
      certificate_uploaded_at: null,
    })
    .eq("id", userData.user.id)
    .eq("role", "trainer")
    .select(profileSelect())
    .single();

  if (error) return { data: null, error: "Certificate could not be removed from your profile." };
  void supabase.storage.from(TRAINER_CERTIFICATE_BUCKET).remove([path]);

  return { data: await mapProfile(data as unknown as TrainerProfileRow), error: null };
}
