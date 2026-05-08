import { Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/model/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAdmin, isLoading } = useAuth()
  const token = localStorage.getItem('access_token')

  if (isLoading) return null

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/map" replace />
  }

  return <>{children}</>
}
