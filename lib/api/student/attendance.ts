import { supabase } from "@/lib/supabase";
import type { StudentResult } from "./enrollment";

export type StudentAttendanceRecord = {
  sessionDate: string;
  status: "present" | "absent";
};

type AttendanceRow = {
  status: StudentAttendanceRecord["status"];
  attendance_sessions: Relation<{
    session_date: string;
  }>;
};

type Relation<T> = T | T[] | null;

function one<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getMyAttendance(classroomId: string): Promise<StudentResult<StudentAttendanceRecord[]>> {
  if (!supabase) return { data: null, error: "Supabase is not configured for this deployment." };

  const { data, error } = await supabase
    .from("attendance_records")
    .select(`
      status,
      attendance_sessions!inner (
        session_date,
        classroom_id
      )
    `)
    .eq("attendance_sessions.classroom_id", classroomId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching student attendance:", error);
    return { data: null, error: "Failed to fetch attendance." };
  }

  const records = ((data ?? []) as unknown as AttendanceRow[]).flatMap((row) => {
    const session = one(row.attendance_sessions);
    if (!session?.session_date) return [];
    return [{ sessionDate: session.session_date, status: row.status }];
  });

  return { data: records, error: null };
}
