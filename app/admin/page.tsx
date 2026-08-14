import { ProtectedRoute } from "@/components/protected-route";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default function AdminPage() {
  return <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>;
}
