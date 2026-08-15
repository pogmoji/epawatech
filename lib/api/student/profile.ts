import { supabase } from "@/lib/supabase";
import type { StudentResult } from "./enrollment";

export const STUDENT_AVATAR_BUCKET = "student-avatars";
export const STUDENT_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const STUDENT_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type StudentProfileDetails = {
  id: string;
  fullName: string;
  username: string | null;
  bio: string | null;
  gradeClass: string | null;
  termGoals: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
};

type StudentProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  bio: string | null;
  grade_class: string | null;
  term_goals: string | null;
  avatar_path: string | null;
};

export type StudentProfileInput = {
  fullName: string;
  bio: string;
  gradeClass: string;
  termGoals: string;
};

function publicAvatarUrl(path: string | null) {
  if (!supabase || !path) return null;
  return supabase.storage.from(STUDENT_AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

function mapProfile(row: StudentProfileRow): StudentProfileDetails {
  return {
    id: row.id,
    fullName: row.full_name?.trim() || "",
    username: row.username,
    bio: row.bio,
    gradeClass: row.grade_class,
    termGoals: row.term_goals,
    avatarPath: row.avatar_path,
    avatarUrl: publicAvatarUrl(row.avatar_path),
  };
}

function cleanOptionalText(value: string, maxLength: number) {
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function profileFieldsUnavailable(message: string) {
  return message.includes("bio") || message.includes("grade_class") || message.includes("term_goals") || message.includes("avatar_path");
}

export async function getMyStudentProfile(): Promise<StudentResult<StudentProfileDetails>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, bio, grade_class, term_goals, avatar_path")
    .eq("role", "student")
    .maybeSingle();

  if (error) {
    const message = profileFieldsUnavailable(error.message)
      ? "Student profile fields are not ready yet. Run migration 018 in Supabase, then refresh."
      : "Your profile could not be loaded.";
    return { data: null, error: message };
  }

  if (!data) return { data: null, error: "Your student profile could not be found." };
  return { data: mapProfile(data as StudentProfileRow), error: null };
}

export async function updateMyStudentProfile(input: StudentProfileInput): Promise<StudentResult<StudentProfileDetails>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const fullName = input.fullName.trim();
  if (fullName.length < 2) return { data: null, error: "Enter your display name." };
  if (fullName.length > 120) return { data: null, error: "Display name is too long." };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      bio: cleanOptionalText(input.bio, 500),
      grade_class: cleanOptionalText(input.gradeClass, 80),
      term_goals: cleanOptionalText(input.termGoals, 500),
    })
    .eq("role", "student")
    .select("id, full_name, username, bio, grade_class, term_goals, avatar_path")
    .single();

  if (error) {
    const message = profileFieldsUnavailable(error.message)
      ? "Student profile fields are not ready yet. Run migration 018 in Supabase, then try again."
      : "Your profile could not be saved.";
    return { data: null, error: message };
  }

  return { data: mapProfile(data as StudentProfileRow), error: null };
}

export async function uploadMyStudentAvatar(file: File, previousPath?: string | null): Promise<StudentResult<StudentProfileDetails>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Not authenticated." };
  if (!STUDENT_AVATAR_TYPES.includes(file.type)) return { data: null, error: "Upload a JPG, PNG, or WebP image." };
  if (file.size > STUDENT_AVATAR_MAX_BYTES) return { data: null, error: "Avatar image must be 2 MB or smaller." };

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const avatarPath = `${userData.user.id}/${Date.now()}.${extension}`;
  const upload = await supabase.storage.from(STUDENT_AVATAR_BUCKET).upload(avatarPath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (upload.error) {
    return { data: null, error: upload.error.message || "Avatar could not be uploaded." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_path: avatarPath })
    .eq("id", userData.user.id)
    .eq("role", "student")
    .select("id, full_name, username, bio, grade_class, term_goals, avatar_path")
    .single();

  if (error) return { data: null, error: "Avatar uploaded, but your profile could not be updated." };

  if (previousPath && previousPath !== avatarPath) {
    void supabase.storage.from(STUDENT_AVATAR_BUCKET).remove([previousPath]);
  }

  return { data: mapProfile(data as StudentProfileRow), error: null };
}
