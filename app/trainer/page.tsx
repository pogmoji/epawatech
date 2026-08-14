import TrainerDashboard from '@/components/trainer/trainer-dashboard'
import { ProtectedRoute } from '@/components/protected-route'

export default function TrainerPage() {
  return <ProtectedRoute role="trainer"><TrainerDashboard /></ProtectedRoute>
}
