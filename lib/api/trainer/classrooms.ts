import { supabase } from "@/lib/supabase";

export type TrainerResult<T> = { data: T; error: null } | { data: null; error: string };

export type TrainerClassroom = {
  id: string;
  name: string;
  status: string;
  cohortId: string;
  cohortName: string;
  centreId: string;
  centreName: string;
  assignmentId: string;
  assignmentRole: "lead" | "co_teacher";
};

export type TrainerAssignmentContext = {
  id: string;
  role: "lead" | "co_teacher";
  status: string;
  classroomId: string | null;
  cohortId: string | null;
  centreId: string | null;
  classroom: TrainerClassroom | null;
};

export type TrainerClassroomContext = {
  activeAssignments: TrainerAssignmentContext[];
  activeClassrooms: TrainerClassroom[];
  schemaLimitation: string | null;
};

type AssignmentRow = {
  id: string;
  classroom_id: string | null;
  cohort_id: string | null;
  centre_id: string | null;
  role: "lead" | "co_teacher";
  status: string;
};

type ClassroomRow = {
  id: string;
  name: string;
  cohort_id: string;
  status: string;
};

type CohortRow = {
  id: string;
  name: string;
  centre_id: string;
};

type CentreRow = {
  id: string;
  name: string;
};

function unavailable<T>(): TrainerResult<T> {
  return { data: null, error: "Supabase is not configured for this deployment." };
}

function failure<T>(): TrainerResult<T> {
  return { data: null, error: "We could not load your teaching context. Please try again." };
}

/**
 * Returns only the signed-in trainer's current teaching context.
 * The database RLS policies remain the authorization boundary; callers never
 * provide a trainer id or use an arbitrary classroom id to establish access.
 *
 * Trainer assignments may be organizational Centre/Cohort assignments before a
 * classroom exists, or concrete classroom assignments once Admin activates and
 * assigns a classroom.
 */
export async function getTrainerClassroomContext(): Promise<TrainerResult<TrainerClassroomContext>> {
  if (!supabase) return unavailable();

  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from("trainer_assignments")
    .select("id, classroom_id, centre_id, cohort_id, role, status")
    .eq("status", "active");

  if (assignmentsError) return failure();

  const assignments = (assignmentsData ?? []) as AssignmentRow[];
  if (!assignments.length) {
    return {
      data: {
        activeAssignments: [],
        activeClassrooms: [],
        schemaLimitation: null,
      },
      error: null,
    };
  }

  const classroomAssignments = assignments.filter((assignment) => assignment.classroom_id);
  if (!classroomAssignments.length) {
    return {
      data: {
        activeAssignments: assignments.map((assignment) => ({
          id: assignment.id,
          role: assignment.role,
          status: assignment.status,
          classroomId: assignment.classroom_id,
          cohortId: assignment.cohort_id,
          centreId: assignment.centre_id,
          classroom: null,
        })),
        activeClassrooms: [],
        schemaLimitation: null,
      },
      error: null,
    };
  }

  const classroomIds = classroomAssignments.map((assignment) => assignment.classroom_id as string);
  const { data: classroomsData, error: classroomsError } = await supabase
    .from("classrooms")
    .select("id, name, cohort_id, status")
    .in("id", classroomIds)
    .order("name");

  if (classroomsError) return failure();

  const classrooms = (classroomsData ?? []) as ClassroomRow[];
  if (!classrooms.length) {
    return {
      data: {
        activeAssignments: assignments.map((assignment) => ({
          id: assignment.id,
          role: assignment.role,
          status: assignment.status,
          classroomId: assignment.classroom_id,
          cohortId: assignment.cohort_id,
          centreId: assignment.centre_id,
          classroom: null,
        })),
        activeClassrooms: [],
        schemaLimitation:
          "Active trainer assignments exist, but their classroom records were not returned by RLS.",
      },
      error: null,
    };
  }

  const cohortIds = [...new Set(classrooms.map((classroom) => classroom.cohort_id))];
  const { data: cohortsData, error: cohortsError } = await supabase
    .from("cohorts")
    .select("id, name, centre_id")
    .in("id", cohortIds);

  if (cohortsError) return failure();

  const cohorts = (cohortsData ?? []) as CohortRow[];
  const centreIds = [...new Set(cohorts.map((cohort) => cohort.centre_id))];
  const { data: centresData, error: centresError } = await supabase
    .from("centres")
    .select("id, name")
    .in("id", centreIds);

  if (centresError) return failure();

  const cohortById = new Map(cohorts.map((cohort) => [cohort.id, cohort]));
  const centreById = new Map(((centresData ?? []) as CentreRow[]).map((centre) => [centre.id, centre]));
  const classroomById = new Map(
    classrooms.flatMap((classroom) => {
      const assignment = assignments.find((current) => current.classroom_id === classroom.id);
      const cohort = cohortById.get(classroom.cohort_id);
      const centre = cohort ? centreById.get(cohort.centre_id) : undefined;
      if (!assignment || !cohort || !centre) return [];

      return [[
        classroom.id,
        {
          id: classroom.id,
          name: classroom.name,
          status: classroom.status,
          cohortId: cohort.id,
          cohortName: cohort.name,
          centreId: centre.id,
          centreName: centre.name,
          assignmentId: assignment.id,
          assignmentRole: assignment.role,
        } satisfies TrainerClassroom,
      ]];
    }),
  );
  const activeAssignments = assignments.map((assignment) => ({
    id: assignment.id,
    role: assignment.role,
    status: assignment.status,
    classroomId: assignment.classroom_id,
    cohortId: assignment.cohort_id,
    centreId: assignment.centre_id,
    classroom: assignment.classroom_id ? classroomById.get(assignment.classroom_id) ?? null : null,
  }));

  return {
    data: {
      activeAssignments,
      activeClassrooms: activeAssignments
        .map((assignment) => assignment.classroom)
        .filter((classroom): classroom is TrainerClassroom => classroom?.status === "active"),
      schemaLimitation: null,
    },
    error: null,
  };
}

export async function rotateClassroomJoinCode(classroomId: string): Promise<TrainerResult<string>> {
  if (!supabase) return unavailable();

  const { data, error } = await supabase.rpc("rotate_classroom_join_code", {
    p_classroom_id: classroomId,
  });

  if (error) {
    return { data: null, error: error.message || "The classroom join code could not be rotated." };
  }

  return { data: data as string, error: null };
}
