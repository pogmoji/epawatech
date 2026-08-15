import { supabase } from "@/lib/supabase";
import { tracks } from "@/lib/curriculum";
import { TrainerResult } from "./classrooms";

export type StudentSummary = {
  id: string;
  name: string;
  initials: string;
  enrollmentStatus: string;
  attendanceSummary: string;
  progressSummary: string;
  homeworkSummary: string;
  progressPercent: number | null;
  attendancePercent: number | null;
};

type Relation<T> = T | T[] | null;

type EnrollmentRow = {
  student_id: string;
  status: string;
  profiles: Relation<{ full_name: string | null; username: string | null }>;
};

type CurriculumOverrideRow = {
  removed: boolean;
};

type ClassroomCurriculumItemRow = {
  id: string;
  origin: "master" | "custom";
  state: "draft" | "live" | "completed" | "hidden";
  removed: boolean;
};

function one<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function masterCurriculumItemCount() {
  return tracks.reduce((total, track) => total + track.lessons.length + (track.challenge ? 1 : 0), 0);
}

export async function getTrainerClassroomStudents(classroomId: string): Promise<TrainerResult<StudentSummary[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: enrollmentsData, error: enrollmentsError } = await supabase
    .from("student_enrollments")
    .select(`
      id,
      status,
      student_id,
      profiles:student_id ( id, full_name, username )
    `)
    .eq("classroom_id", classroomId)
    .eq("status", "active");

  if (enrollmentsError) {
    console.error("Error fetching students:", enrollmentsError);
    return { data: null, error: "Failed to fetch students. Please try again." };
  }

  const enrollments = (enrollmentsData || []) as unknown as EnrollmentRow[];
  const studentIds = enrollments.map((enrollment) => enrollment.student_id);
  const [attendanceRes, progressRes, challengeRes, overridesRes, customItemsRes] = await Promise.all([
    studentIds.length
      ? supabase
          .from("attendance_records")
          .select("student_id, status, attendance_sessions!inner(classroom_id)")
          .in("student_id", studentIds)
          .eq("attendance_sessions.classroom_id", classroomId)
      : Promise.resolve({ data: [], error: null }),
    studentIds.length
      ? supabase
          .from("lesson_progress")
          .select("student_id, status")
          .in("student_id", studentIds)
          .eq("classroom_id", classroomId)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("challenge_assignments")
      .select("id")
      .eq("classroom_id", classroomId),
    supabase
      .from("classroom_curriculum_overrides")
      .select("removed")
      .eq("classroom_id", classroomId),
    supabase
      .from("classroom_curriculum_items")
      .select("id, origin, state, removed")
      .eq("classroom_id", classroomId)
      .eq("origin", "custom"),
  ]);

  if (attendanceRes.error || progressRes.error || challengeRes.error || overridesRes.error || customItemsRes.error) {
    return { data: null, error: "Failed to fetch student summaries. Please try again." };
  }

  const removedMasterCount = ((overridesRes.data ?? []) as CurriculumOverrideRow[]).filter((item) => item.removed).length;
  const liveCustomCount = ((customItemsRes.data ?? []) as ClassroomCurriculumItemRow[]).filter(
    (item) => !item.removed && item.state === "live",
  ).length;
  const activeCurriculumTotal = Math.max(0, masterCurriculumItemCount() - removedMasterCount + liveCustomCount);

  const attendanceByStudent = new Map<string, { present: number; total: number }>();
  for (const record of (attendanceRes.data || []) as { student_id: string; status: string }[]) {
    const current = attendanceByStudent.get(record.student_id) ?? { present: 0, total: 0 };
    current.total += 1;
    if (record.status === "present") current.present += 1;
    attendanceByStudent.set(record.student_id, current);
  }

  const progressByStudent = new Map<string, { completed: number }>();
  for (const record of (progressRes.data || []) as { student_id: string; status: string }[]) {
    const current = progressByStudent.get(record.student_id) ?? { completed: 0 };
    if (record.status === "completed") current.completed += 1;
    progressByStudent.set(record.student_id, current);
  }

  const challengeCount = (challengeRes.data ?? []).length;
  const students = enrollments.map((enrollment) => {
    const profile = one(enrollment.profiles);
    const fullName = profile?.full_name?.trim() || profile?.username || `Student ${enrollment.student_id.slice(0, 8)}`;
    const initials = fullName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const attendance = attendanceByStudent.get(enrollment.student_id);
    const progress = progressByStudent.get(enrollment.student_id);
    const attendancePercent = attendance?.total ? Math.round((attendance.present / attendance.total) * 100) : null;
    const progressPercent = activeCurriculumTotal ? Math.round(((progress?.completed ?? 0) / activeCurriculumTotal) * 100) : null;

    return {
      id: enrollment.student_id,
      name: fullName,
      initials,
      enrollmentStatus: enrollment.status,
      attendanceSummary: attendancePercent === null ? "No attendance yet" : `${attendancePercent}%`,
      progressSummary: progressPercent === null ? "No curriculum items" : `${progress?.completed ?? 0}/${activeCurriculumTotal} complete`,
      homeworkSummary: challengeCount ? `${challengeCount} assigned` : "No homework assigned",
      progressPercent,
      attendancePercent,
    } satisfies StudentSummary;
  });

  return { data: students, error: null };
}
