import { supabase } from "@/lib/supabase";
import type { StudentResult } from "./enrollment";

export type ProjectRecord = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  video_url: string | null;
  status: "draft" | "submitted" | "approved" | "rejected";
  created_at: string;
};

export async function getApprovedProjects(limit?: number): Promise<StudentResult<ProjectRecord[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  let query = supabase
    .from("projects")
    .select("id, title, description, image_url, video_url, status, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) return { data: null, error: "Failed to load approved projects." };
  return { data: (data ?? []) as ProjectRecord[], error: null };
}

export async function submitStudentProject(input: {
  classroomId: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  storagePath?: string | null;
}): Promise<StudentResult<ProjectRecord>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Sign in as a student before submitting a project." };

  const { data, error } = await supabase
    .from("projects")
    .insert({
      student_id: userData.user.id,
      classroom_id: input.classroomId,
      title: input.title.trim(),
      description: input.description.trim(),
      image_url: input.imageUrl || null,
      video_url: input.videoUrl || null,
      storage_path: input.storagePath || null,
      status: "submitted",
    })
    .select("id, title, description, image_url, video_url, status, created_at")
    .single();

  if (error) return { data: null, error: "Your project could not be submitted." };
  return { data: data as ProjectRecord, error: null };
}
