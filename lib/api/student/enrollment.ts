import { supabase } from "@/lib/supabase";

export type StudentResult<T> = { data: T; error: null } | { data: null; error: string };

export type EnrollmentContext = {
  id: string;
  classroomId: string;
  classroomName: string;
  cohortId: string;
  cohortName: string;
  centreId: string;
  centreName: string;
  trainerName: string;
};

type Relation<T> = T | T[] | null;

type EnrollmentRow = {
  id: string;
  classroom_id: string;
  classrooms: Relation<{
    id: string;
    name: string;
    cohort_id: string;
    cohorts: Relation<{
      id: string;
      name: string;
      centre_id: string;
      centres: Relation<{ id: string; name: string }>;
    }>;
    trainer_assignments: Relation<{
      role: string;
      profiles: Relation<{ full_name: string }>;
    }>;
  }>;
};

function one<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getStudentEnrollmentContext(): Promise<StudentResult<EnrollmentContext>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: enrollmentData, error: enrollmentError } = await supabase
    .from("student_enrollments")
    .select(`
      id,
      classroom_id,
      classrooms (
        id,
        name,
        cohort_id,
        cohorts (
          id,
          name,
          centre_id,
          centres ( id, name )
        ),
        trainer_assignments (
          role,
          profiles:trainer_id ( full_name )
        )
      )
    `)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (enrollmentError) {
    console.error("Error fetching student enrollment:", enrollmentError);
    return { data: null, error: "Failed to fetch enrollment context." };
  }

  if (!enrollmentData || !enrollmentData.classrooms) {
    return { data: null, error: "No active classroom enrollment found." };
  }

  const enrollment = enrollmentData as unknown as EnrollmentRow;
  const classroom = one(enrollment.classrooms);
  const cohort = one(classroom?.cohorts ?? null);
  const centre = one(cohort?.centres ?? null);
  const assignments = classroom?.trainer_assignments || [];
  const leadTrainer = (Array.isArray(assignments) ? assignments : [assignments]).find((assignment) => assignment?.role === "lead");
  const trainerProfile = leadTrainer?.profiles;
  const trainerName = one(trainerProfile ?? null)?.full_name || "Trainer";

  return {
    data: {
      id: enrollment.id,
      classroomId: enrollment.classroom_id,
      classroomName: classroom?.name || "Unknown Classroom",
      cohortId: cohort?.id || "",
      cohortName: cohort?.name || "Unknown Cohort",
      centreId: centre?.id || "",
      centreName: centre?.name || "Unknown Centre",
      trainerName,
    },
    error: null,
  };
}

export async function joinClassroomByCode(joinCode: string): Promise<StudentResult<string>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const code = joinCode.trim();
  if (!code) return { data: null, error: "Enter a classroom join code." };

  const { data, error } = await supabase.rpc("join_classroom_by_code", {
    p_join_code: code,
  });

  if (error) {
    return { data: null, error: error.message || "The classroom code could not be used." };
  }

  return { data: data as string, error: null };
}
