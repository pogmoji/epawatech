import { ProtectedRoute } from "@/components/protected-route";
import LearnPage from "@/components/learn/learn-page";

export default function StudentPage() {
  return <ProtectedRoute role="student"><LearnPage /></ProtectedRoute>;
}
