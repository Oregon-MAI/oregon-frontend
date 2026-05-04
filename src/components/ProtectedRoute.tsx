import { Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/model/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth()
  const token = localStorage.getItem('access_token')

  if (isLoading) return null

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
