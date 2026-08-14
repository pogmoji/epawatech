import { supabase } from "@/lib/supabase";
import { TrainerResult } from "./classrooms";

export type AttendanceRecord = {
  studentId: string;
  status: "present" | "absent";
};

export type AttendanceSessionSummary = {
  id: string;
  classroomId: string;
  sessionDate: string;
  present: number;
  absent: number;
  total: number;
};

type AttendanceRecordRow = {
  student_id: string;
  status: AttendanceRecord["status"];
};

export async function getAttendance(classroomId: string, date: string): Promise<TrainerResult<AttendanceRecord[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  // First find the session
  const { data: sessionData, error: sessionError } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("classroom_id", classroomId)
    .eq("session_date", date)
    .single();

  if (sessionError && sessionError.code !== "PGRST116") { // PGRST116 is not found
    console.error("Error fetching attendance session:", sessionError);
    return { data: null, error: "Failed to fetch attendance. Please try again." };
  }

  if (!sessionData) {
    return { data: [], error: null };
  }

  const { data: recordsData, error: recordsError } = await supabase
    .from("attendance_records")
    .select("student_id, status")
    .eq("attendance_session_id", sessionData.id);

  if (recordsError) {
    console.error("Error fetching attendance records:", recordsError);
    return { data: null, error: "Failed to fetch attendance. Please try again." };
  }

  const records = ((recordsData || []) as AttendanceRecordRow[]).map((record) => ({
    studentId: record.student_id,
    status: record.status,
  }));

  return { data: records, error: null };
}

export async function getAttendanceSessions(classroomId: string): Promise<TrainerResult<AttendanceSessionSummary[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data: sessionsData, error: sessionsError } = await supabase
    .from("attendance_sessions")
    .select("id, classroom_id, session_date")
    .eq("classroom_id", classroomId)
    .order("session_date", { ascending: false });

  if (sessionsError) return { data: null, error: "Attendance history could not be loaded." };

  const sessionIds = (sessionsData ?? []).map((session) => session.id);
  const { data: recordsData, error: recordsError } = sessionIds.length
    ? await supabase.from("attendance_records").select("attendance_session_id, status").in("attendance_session_id", sessionIds)
    : { data: [], error: null };

  if (recordsError) return { data: null, error: "Attendance records could not be loaded." };

  const counts = new Map<string, { present: number; absent: number; total: number }>();
  for (const record of (recordsData ?? []) as { attendance_session_id: string; status: AttendanceRecord["status"] }[]) {
    const current = counts.get(record.attendance_session_id) ?? { present: 0, absent: 0, total: 0 };
    current.total += 1;
    if (record.status === "present") current.present += 1;
    if (record.status === "absent") current.absent += 1;
    counts.set(record.attendance_session_id, current);
  }

  return {
    data: (sessionsData ?? []).map((session) => {
      const count = counts.get(session.id) ?? { present: 0, absent: 0, total: 0 };
      return {
        id: session.id,
        classroomId: session.classroom_id,
        sessionDate: session.session_date,
        ...count,
      };
    }),
    error: null,
  };
}

export async function recordAttendance(classroomId: string, date: string, records: AttendanceRecord[]): Promise<TrainerResult<boolean>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  // Check if session exists
  const { data: sessionData, error: sessionError } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("classroom_id", classroomId)
    .eq("session_date", date)
    .single();

  if (sessionError && sessionError.code !== "PGRST116") {
    console.error("Error checking attendance session:", sessionError);
    return { data: null, error: "Failed to save attendance." };
  }

  // If session doesn't exist, create it
  let sessionId = sessionData?.id;
  if (!sessionId) {
    // Get current user (trainer)
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { data: null, error: "Not authenticated" };
    }

    const { data: newSession, error: createSessionError } = await supabase
      .from("attendance_sessions")
      .insert({
        classroom_id: classroomId,
        session_date: date,
        created_by: userData.user.id
      })
      .select("id")
      .single();
      
    if (createSessionError || !newSession) {
      console.error("Error creating attendance session:", createSessionError);
      return { data: null, error: "Failed to save attendance." };
    }
    sessionId = newSession.id;
  }

  // Insert/upsert records
  const upsertData = records.map(record => ({
    attendance_session_id: sessionId,
    student_id: record.studentId,
    status: record.status,
  }));

  const { error: upsertError } = await supabase
    .from("attendance_records")
    .upsert(upsertData, { onConflict: "attendance_session_id,student_id" });

  if (upsertError) {
    console.error("Error saving attendance records:", upsertError);
    return { data: null, error: "Failed to save attendance." };
  }

  return { data: true, error: null };
}
