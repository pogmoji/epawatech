import { ProtectedRoute } from "@/components/protected-route";
import StudentDashboard from "@/components/student/student-dashboard";

export default function StudentPage() {
  return <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>;
}
