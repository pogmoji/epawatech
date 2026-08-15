import { supabase } from "@/lib/supabase";

export type AdminResult<T> = { data: T; error: null } | { data: null; error: string };

export type Centre = { id: string; name: string; description: string | null; status: string; created_at: string };
export type Cohort = { id: string; centre_id: string; name: string; status: string; start_date: string | null; end_date: string | null; created_at: string };
export type ProfileRecord = { id: string; full_name: string; username: string | null; phone_number: string | null; role: "admin" | "trainer" | "student"; status: "pending" | "active" | "suspended" | "rejected"; created_at: string };
export type Classroom = { id: string; cohort_id: string; name: string; status: string; created_by: string; created_at: string };
export type TrainerAssignment = { id: string; trainer_id: string; classroom_id: string | null; centre_id: string | null; cohort_id: string | null; role: string; status: string; start_date: string | null; end_date: string | null };
export type StudentEnrollment = { id: string; student_id: string; classroom_id: string; status: string; start_date: string | null; end_date: string | null };
export type StudentFeedbackRecord = { id: string; student_id: string; classroom_id: string | null; feedback_text: string; created_at: string; updated_at: string };
export type ChallengeLevelRecord = { id: string; name: string; slug: string; difficulty: "easy" | "medium" | "hard" | "extreme"; sort_order: number; is_active: boolean };
export type UniversalChallengeRecord = { id: string; level_id: string; title: string; description: string; instructions: string; sort_order: number; is_required: boolean; is_published: boolean; created_by_admin_id: string | null; created_at: string; updated_at: string; completions?: number };
export type TrainerAdminReportRecord = {
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
  status: "submitted" | "reviewed" | "resolved";
  email_notification_status: string | null;
  email_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminDashboardData = {
  centres: Centre[];
  cohorts: Cohort[];
  admins: ProfileRecord[];
  trainers: ProfileRecord[];
  students: ProfileRecord[];
  classrooms: Classroom[];
  assignments: TrainerAssignment[];
  enrollments: StudentEnrollment[];
  feedback: StudentFeedbackRecord[];
  challengeLevels: ChallengeLevelRecord[];
  universalChallenges: UniversalChallengeRecord[];
  trainerReports: TrainerAdminReportRecord[];
};

function unavailable<T>(): AdminResult<T> {
  return { data: null, error: "Supabase is not configured for this deployment." };
}

function failure<T>(message: string): AdminResult<T> {
  return { data: null, error: message };
}

export async function getAdminDashboardData(): Promise<AdminResult<AdminDashboardData>> {
  if (!supabase) return unavailable();

  const [centres, cohorts, admins, trainers, students, classrooms, assignments, enrollments, feedback, challengeLevels, universalChallenges, challengeProgress, trainerReports] = await Promise.all([
    supabase.from("centres").select("id, name, description, status, created_at").order("name"),
    supabase.from("cohorts").select("id, centre_id, name, status, start_date, end_date, created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, username, phone_number, role, status, created_at").eq("role", "admin").order("full_name"),
    supabase.from("profiles").select("id, full_name, username, phone_number, role, status, created_at").eq("role", "trainer").order("full_name"),
    supabase.from("profiles").select("id, full_name, username, phone_number, role, status, created_at").eq("role", "student").order("full_name"),
    supabase.from("classrooms").select("id, cohort_id, name, status, created_by, created_at").order("name"),
    supabase.from("trainer_assignments").select("id, trainer_id, classroom_id, centre_id, cohort_id, role, status, start_date, end_date"),
    supabase.from("student_enrollments").select("id, student_id, classroom_id, status, start_date, end_date"),
    supabase.from("student_feedback").select("id, student_id, classroom_id, feedback_text, created_at, updated_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("challenge_levels").select("id, name, slug, difficulty, sort_order, is_active").order("sort_order"),
    supabase.from("challenges").select("id, level_id, title, description, instructions, sort_order, is_required, is_published, created_by_admin_id, created_at, updated_at").order("sort_order"),
    supabase.from("student_challenge_progress").select("challenge_id, status").eq("status", "completed"),
    supabase.from("trainer_admin_reports").select("id, trainer_id, trainer_email, classroom_id, category, priority, subject, message, attachment_path, attachment_file_name, attachment_mime_type, attachment_file_size, status, email_notification_status, email_sent_at, created_at, updated_at").order("created_at", { ascending: false }).limit(100),
  ]);

  const requiredQueryError = [centres, cohorts, admins, trainers, students, classrooms, assignments, enrollments].find((result) => result.error)?.error;
  if (requiredQueryError) return failure("Unable to load administrative data. Please try again.");
  const feedbackData = feedback.error ? [] : (feedback.data ?? []) as StudentFeedbackRecord[];
  const trainerReportsData = trainerReports.error ? [] : (trainerReports.data ?? []) as TrainerAdminReportRecord[];
  const challengeLevelsData = challengeLevels.error ? [] : (challengeLevels.data ?? []) as ChallengeLevelRecord[];
  const completedCounts = new Map<string, number>();
  if (!challengeProgress.error) {
    for (const row of (challengeProgress.data ?? []) as { challenge_id: string; status: string }[]) {
      completedCounts.set(row.challenge_id, (completedCounts.get(row.challenge_id) ?? 0) + 1);
    }
  }
  const universalChallengesData = universalChallenges.error
    ? []
    : ((universalChallenges.data ?? []) as UniversalChallengeRecord[]).map((challenge) => ({
        ...challenge,
        completions: completedCounts.get(challenge.id) ?? 0,
      }));

  return {
    data: {
      centres: (centres.data ?? []) as Centre[], cohorts: (cohorts.data ?? []) as Cohort[],
      admins: (admins.data ?? []) as ProfileRecord[],
      trainers: (trainers.data ?? []) as ProfileRecord[], students: (students.data ?? []) as ProfileRecord[],
      classrooms: (classrooms.data ?? []) as Classroom[], assignments: (assignments.data ?? []) as TrainerAssignment[],
      enrollments: (enrollments.data ?? []) as StudentEnrollment[],
      feedback: feedbackData,
      challengeLevels: challengeLevelsData,
      universalChallenges: universalChallengesData,
      trainerReports: trainerReportsData,
    },
    error: null,
  };
}

export async function updateTrainerAdminReportStatus(input: {
  id: string;
  status: "reviewed" | "resolved";
}): Promise<AdminResult<TrainerAdminReportRecord>> {
  if (!supabase) return unavailable();

  const { data, error } = await supabase
    .from("trainer_admin_reports")
    .update({ status: input.status })
    .eq("id", input.id)
    .select("id, trainer_id, trainer_email, classroom_id, category, priority, subject, message, attachment_path, attachment_file_name, attachment_mime_type, attachment_file_size, status, email_notification_status, email_sent_at, created_at, updated_at")
    .single();

  if (error) return failure("Trainer report status could not be updated.");
  return { data: data as TrainerAdminReportRecord, error: null };
}

export async function createUniversalChallenge(input: {
  levelId: string;
  title: string;
  description: string;
  instructions: string;
  sortOrder: number;
  isRequired: boolean;
  isPublished: boolean;
}): Promise<AdminResult<UniversalChallengeRecord>> {
  if (!supabase) return unavailable();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return failure("Not authenticated.");

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      level_id: input.levelId,
      title: input.title.trim(),
      description: input.description.trim(),
      instructions: input.instructions.trim(),
      sort_order: input.sortOrder,
      is_required: input.isRequired,
      is_published: input.isPublished,
      created_by_admin_id: userData.user.id,
    })
    .select("id, level_id, title, description, instructions, sort_order, is_required, is_published, created_by_admin_id, created_at, updated_at")
    .single();

  if (error) return failure(error.message.includes("challenges") ? "Run migration 020 before creating universal challenges." : "Universal challenge could not be created.");
  return { data: { ...(data as UniversalChallengeRecord), completions: 0 }, error: null };
}

export async function updateUniversalChallenge(input: {
  id: string;
  levelId: string;
  title: string;
  description: string;
  instructions: string;
  sortOrder: number;
  isRequired: boolean;
  isPublished: boolean;
}): Promise<AdminResult<UniversalChallengeRecord>> {
  if (!supabase) return unavailable();

  const { data, error } = await supabase
    .from("challenges")
    .update({
      level_id: input.levelId,
      title: input.title.trim(),
      description: input.description.trim(),
      instructions: input.instructions.trim(),
      sort_order: input.sortOrder,
      is_required: input.isRequired,
      is_published: input.isPublished,
    })
    .eq("id", input.id)
    .select("id, level_id, title, description, instructions, sort_order, is_required, is_published, created_by_admin_id, created_at, updated_at")
    .single();

  if (error) return failure("Universal challenge could not be updated.");
  return { data: data as UniversalChallengeRecord, error: null };
}

export async function createCentre(input: { name: string; description: string }): Promise<AdminResult<Centre>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.from("centres").insert({ name: input.name.trim(), description: input.description.trim() || null }).select("id, name, description, status, created_at").single();
  if (error) return failure(error.message.includes("duplicate") ? "A centre with that name already exists." : "Unable to create the centre. Please try again.");
  return { data: data as Centre, error: null };
}

export async function createCohort(input: { centreId: string; name: string; status: string; startDate: string; endDate: string }): Promise<AdminResult<Cohort>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.from("cohorts").insert({ centre_id: input.centreId, name: input.name.trim(), status: input.status, start_date: input.startDate || null, end_date: input.endDate || null }).select("id, centre_id, name, status, start_date, end_date, created_at").single();
  if (error) {
    const isActiveConflict = error.message.toLowerCase().includes("one_active") || error.message.toLowerCase().includes("duplicate");
    return failure(isActiveConflict ? "This centre already has an active cohort. End or change it before activating another." : "Unable to create the cohort. Please check the dates and try again.");
  }
  return { data: data as Cohort, error: null };
}

export async function updateTrainerStatus(id: string, status: "active" | "rejected"): Promise<AdminResult<ProfileRecord>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.from("profiles").update({ status }).eq("id", id).eq("role", "trainer").select("id, full_name, username, phone_number, role, status, created_at").single();
  if (error) return failure(`Unable to ${status === "active" ? "approve" : "reject"} the trainer. Please try again.`);
  return { data: data as ProfileRecord, error: null };
}

export async function getProfiles(): Promise<AdminResult<ProfileRecord[]>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.from("profiles").select("id, full_name, username, phone_number, role, status, created_at").order("full_name");
  if (error) return failure("We could not load account profiles.");
  return { data: (data ?? []) as ProfileRecord[], error: null };
}

export async function updateProfileDetails(id: string, input: { fullName: string; username: string | null; phoneNumber: string | null }): Promise<AdminResult<ProfileRecord>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.from("profiles").update({ full_name: input.fullName.trim(), username: input.username, phone_number: input.phoneNumber }).eq("id", id).select("id, full_name, username, phone_number, role, status, created_at").single();
  if (error) return failure("The profile could not be updated. Check that the username is unique.");
  return { data: data as ProfileRecord, error: null };
}

export async function assignTrainerToCohort(input: { trainerId: string; cohortId: string; role: "lead" | "co_teacher" }): Promise<AdminResult<TrainerAssignment>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.rpc("admin_assign_trainer_to_cohort", {
    p_trainer_id: input.trainerId,
    p_cohort_id: input.cohortId,
    p_role: input.role,
  });
  if (error) return failure(error.message || "The trainer could not be assigned to that cohort.");
  return { data: data as TrainerAssignment, error: null };
}

export async function createClassroom(input: { cohortId: string; name: string; initialStatus: "pending" | "active"; trainerId: string | null }): Promise<AdminResult<{ classroom_id: string; join_code: string }>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.rpc("admin_create_classroom", {
    p_cohort_id: input.cohortId,
    p_name: input.name.trim(),
    p_initial_status: input.initialStatus,
    p_trainer_id: input.trainerId,
  });
  if (error) return failure(error.message || "The classroom could not be created.");
  const created = Array.isArray(data) ? data[0] : data;
  return { data: created as { classroom_id: string; join_code: string }, error: null };
}

export async function activateClassroom(classroomId: string, trainerId: string | null): Promise<AdminResult<Classroom>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.rpc("admin_activate_classroom", {
    p_classroom_id: classroomId,
    p_trainer_id: trainerId,
  });
  if (error) return failure(error.message || "The classroom could not be activated.");
  return { data: data as Classroom, error: null };
}

export async function assignTrainerToClassroom(input: { classroomId: string; trainerId: string; role: "lead" | "co_teacher" }): Promise<AdminResult<TrainerAssignment>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.rpc("admin_assign_trainer_to_classroom", {
    p_classroom_id: input.classroomId,
    p_trainer_id: input.trainerId,
    p_role: input.role,
  });
  if (error) return failure(error.message || "The trainer could not be assigned to the classroom.");
  return { data: data as TrainerAssignment, error: null };
}

export async function reassignTrainerToClassroom(input: { classroomId: string; trainerId: string }): Promise<AdminResult<TrainerAssignment>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.rpc("admin_change_classroom_lead", {
    p_classroom_id: input.classroomId,
    p_trainer_id: input.trainerId,
  });
  if (error) return failure(error.message || "The Lead Trainer could not be changed.");
  return { data: data as TrainerAssignment, error: null };
}

export async function removeTrainerFromClassroom(input: { classroomId: string; trainerId: string }): Promise<AdminResult<TrainerAssignment>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.rpc("admin_remove_trainer_from_classroom", {
    p_classroom_id: input.classroomId,
    p_trainer_id: input.trainerId,
  });
  if (error) return failure(error.message || "The trainer could not be removed from the classroom.");
  return { data: data as TrainerAssignment, error: null };
}

export async function completeClassroom(classroomId: string): Promise<AdminResult<Classroom>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.rpc("admin_complete_classroom", { p_classroom_id: classroomId });
  if (error) return failure(error.message || "The classroom could not be completed.");
  return { data: data as Classroom, error: null };
}

export async function archiveClassroom(classroomId: string): Promise<AdminResult<Classroom>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.rpc("admin_archive_classroom", { p_classroom_id: classroomId });
  if (error) return failure(error.message || "The classroom could not be archived.");
  return { data: data as Classroom, error: null };
}

export async function rotateClassroomJoinCode(classroomId: string): Promise<AdminResult<string>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.rpc("rotate_classroom_join_code", { p_classroom_id: classroomId });
  if (error) return failure(error.message || "The classroom join code could not be rotated.");
  return { data: data as string, error: null };
}
